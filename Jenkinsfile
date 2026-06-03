pipeline {
  agent any

  environment {
    COMPOSE_PROJECT_NAME = 'nexabank'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Build') {
      steps {
        sh 'docker compose build --pull'
      }
    }

    stage('Deploy') {
      steps {
        // stop any running stack, ignore errors
        sh 'docker compose down || true'
        sh 'docker compose up -d --remove-orphans'
      }
    }
  }

  post {
    success {
      echo 'Jenkins: Deploy succeeded.'
    }
    failure {
      echo 'Jenkins: Deploy failed.'
    }
  }
}
