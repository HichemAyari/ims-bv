pipeline {
  agent any
  environment {
    REGISTRY = "docker.io"
    IMAGE_BACKEND = "ims-backend"
    IMAGE_FRONTEND = "ims-frontend"

    // local deploy path on same VM
    DEPLOY_PATH = "/srv/ims-bv"
    VERSION = "${env.BUILD_NUMBER}"
  }

  stages {
    stage('Checkout') { steps { checkout scm } }

    stage('Backend: Build & Test') {
      steps {
        dir('backend') {
          sh '''
            docker run --rm -v "$PWD":/app -w /app node:20-alpine sh -lc "
              npm ci && npm test
            "
          '''
        }
      }
    }

    stage('Frontend: Build') {
      steps {
        dir('frontend') {
          sh '''
            docker run --rm -v "$PWD":/app -w /app node:20-alpine sh -lc "
              npm ci && npm run build
            "
          '''
        }
      }
    }

    stage('Docker Build & Login') {
      steps {
        withCredentials([usernamePassword(credentialsId: 'dockerhub-creds', usernameVariable: 'DOCKERHUB_USER', passwordVariable: 'DOCKERHUB_PASS')]) {
          sh '''
            echo "${DOCKERHUB_PASS}" | docker login -u "${DOCKERHUB_USER}" --password-stdin ${REGISTRY}

            docker build -t ${REGISTRY}/${DOCKERHUB_USER}/${IMAGE_BACKEND}:${VERSION} backend
            docker build -t ${REGISTRY}/${DOCKERHUB_USER}/${IMAGE_FRONTEND}:${VERSION} frontend

            docker tag ${REGISTRY}/${DOCKERHUB_USER}/${IMAGE_BACKEND}:${VERSION} ${REGISTRY}/${DOCKERHUB_USER}/${IMAGE_BACKEND}:latest
            docker tag ${REGISTRY}/${DOCKERHUB_USER}/${IMAGE_FRONTEND}:${VERSION} ${REGISTRY}/${DOCKERHUB_USER}/${IMAGE_FRONTEND}:latest
          '''
          script { env.NAMESPACE = "${DOCKERHUB_USER}" }
        }
      }
    }

    stage('Push Images') {
      steps {
        sh '''
          docker push ${REGISTRY}/${NAMESPACE}/${IMAGE_BACKEND}:${VERSION}
          docker push ${REGISTRY}/${NAMESPACE}/${IMAGE_FRONTEND}:${VERSION}
          docker push ${REGISTRY}/${NAMESPACE}/${IMAGE_BACKEND}:latest
          docker push ${REGISTRY}/${NAMESPACE}/${IMAGE_FRONTEND}:latest
        '''
      }
    }

    stage('Prepare Deploy Dir') {
      steps {
        sh '''
          mkdir -p ${DEPLOY_PATH}
          cp docker-compose.prod.yml ${DEPLOY_PATH}/docker-compose.prod.yml
        '''
      }
    }

    stage('Write .env for Prod') {
      steps {
        withCredentials([string(credentialsId: 'ims-db-password', variable: 'DB_PASS')]) {
          sh '''
            cat > ${DEPLOY_PATH}/.env <<EOT
REGISTRY=${REGISTRY}
NAMESPACE=${NAMESPACE}
IMAGE_BACKEND=${IMAGE_BACKEND}
IMAGE_FRONTEND=${IMAGE_FRONTEND}
VERSION=${VERSION}
POSTGRES_PASSWORD=${DB_PASS}
POSTGRES_DB=ims_db
EOT
          '''
        }
      }
    }

    stage('Deploy (local)') {
      steps {
        sh '''
          cd ${DEPLOY_PATH}
          docker compose -f docker-compose.prod.yml pull || true
          docker compose -f docker-compose.prod.yml up -d
          docker compose -f docker-compose.prod.yml ps
        '''
      }
    }

    stage('Health Check') {
      steps {
        sh '''
          for i in {1..30}; do
            if curl -fsS http://localhost/health >/dev/null; then
              echo "Health OK"
              exit 0
            fi
            echo "Waiting for app to become healthy..."
            sleep 3
          done
          echo "Health check failed"
          exit 1
        '''
      }
    }
  }

  post {
    success { echo "✅ Deployed build #${VERSION} locally at http://localhost/ (or http://<VM-IP>/)" }
    failure { echo "❌ Deployment failed. Check logs." }
  }
}

