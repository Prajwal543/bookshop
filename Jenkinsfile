pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        skipDefaultCheckout(true)
    }

    environment {
        COMPOSE_PROJECT_NAME = 'papertrail'
    }

    stages {

        stage('Checkout from GitHub') {
            steps {
                checkout scm
            }
        }

        stage('Validate Compose') {
            steps {
                sh 'docker compose config --quiet'
            }
        }

        stage('Build and Deploy') {
            steps {
                sh 'docker compose up -d --build --remove-orphans'
            }
        }

        stage('Verify Deployment') {
            steps {
                sh 'docker compose ps'
            }
        }
    }

<<<<<<< HEAD
    post {
        always {
            sh 'docker compose ps || true'
        }
=======
    stage('Trivy security scan') {
      steps {
        // Fails the deployment when Trivy finds a high or critical vulnerability,
        // exposed secret, or container/IaC misconfiguration in this GitHub revision.
        sh 'trivy fs --scanners vuln,secret,misconfig --severity HIGH,CRITICAL --exit-code 1 --no-progress .'
      }
    }

    stage('Build and deploy') {
      steps {
        // The Jenkins agent is the deployment host. Containers are deliberately
        // left running after a successful build.
        sh 'docker compose up -d --build --remove-orphans'
      }
    }
>>>>>>> 7b8671a (changed the color and ui)

        failure {
            sh 'docker compose logs --tail=100 || true'
        }
    }
}
