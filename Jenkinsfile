pipeline {
  agent any

  options {
    timestamps()
    ansiColor('xterm')
    disableConcurrentBuilds()
    skipDefaultCheckout(true)
  }

  environment {
    COMPOSE_PROJECT_NAME = 'papertrail'
  }

  stages {
    stage('Checkout from GitHub') {
      steps {
        // In a Multibranch Pipeline or a Pipeline configured as “Pipeline script
        // from SCM”, this checks out the exact GitHub branch that triggered Jenkins.
        checkout scm
      }
    }

    stage('Validate application') {
      steps {
        dir('backend') {
          sh 'npm ci'
        }
        sh 'docker compose config --quiet'
      }
    }

    stage('Build and deploy') {
      steps {
        // The Jenkins agent is the deployment host. Containers are deliberately
        // left running after a successful build.
        sh 'docker compose up -d --build --remove-orphans'
      }
    }

    stage('Verify deployment') {
      steps {
        sh 'docker compose ps'
        sh 'docker compose exec -T frontend wget -qO- http://localhost/ > /dev/null'
        sh 'docker compose exec -T frontend wget -qO- http://backend:5000/api/health > /dev/null'
      }
    }
  }

  post {
    failure {
      sh 'docker compose ps || true'
      sh 'docker compose logs --tail=100 || true'
    }
  }
}
