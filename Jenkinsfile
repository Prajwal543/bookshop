pipeline {
  agent any

  options {
    timestamps()
    ansiColor('xterm')
  }

  stages {
    stage('Install API dependencies') {
      steps {
        dir('backend') {
          sh 'npm ci'
        }
      }
    }

    stage('Build containers') {
      steps {
        sh 'docker compose build'
      }
    }

    stage('Verify configuration') {
      steps {
        sh 'docker compose config --quiet'
      }
    }
  }

  post {
    always {
      sh 'docker compose down --remove-orphans || true'
    }
  }
}
