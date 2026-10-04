pipeline {
  agent any

  options {
    timestamps()                 // time on every log line
    disableConcurrentBuilds()    // one build at a time (no two deploys fighting)
  }

  stages {
    stage('Frontend') {
      agent {
        docker {
          image 'node:22'
          reuseNode true         // use the same checked-out code, not a fresh copy
        }
      }
      environment {
        HOME = "${WORKSPACE}"    // see "Why HOME?" below
      }
      steps {
        dir('front') {
          sh 'npm ci'
          sh 'npm run lint'               // lint
          sh 'npm run build'               // build
        }
      }
    }

    stage('Backend') {
      agent {
        docker {
          image 'golang:1.26'            // the Go image (version from go.mod)
          reuseNode true
        }
      }

      environment {
        HOME       = "${WORKSPACE}"
        GOCACHE    = "${WORKSPACE}/.cache/go-build"
        GOMODCACHE = "${WORKSPACE}/.cache/go-mod"
      }
      steps {
        dir('back') {
          sh 'go vet ./...'
          sh 'go build ./...'               // compile everything
          sh 'go test ./...'               // run all tests
        }
      }
    }

    stage('Docker images') {
      steps {
        sh 'docker build -t passbook-api:${BUILD_NUMBER} back'
        sh 'docker build -t passbook-web:${BUILD_NUMBER} front'
      }
    }

    stage('Deploy to test') {
      steps {
        sshagent(credentials: ['deploy-ssh']) {          // the credential ID you created in J.3
          sh """
            ssh han@192.168.1.43 '
              cd ~/Personal-Site &&
              git fetch --quiet origin &&
              git checkout --quiet --detach ${env.GIT_COMMIT} &&
              docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod up -d --build
            '
          """
        }
      }
    }

    stage('Smoke test') {
      steps {
        sh 'curl -fsS -o /dev/null http://192.168.1.43/'                    // the website answers?
        sh 'test "$(curl -s -o /dev/null -w "%{http_code}" http://192.168.1.43/api/me)" = 401'   // the API answers?
      }
    }

  }
}
