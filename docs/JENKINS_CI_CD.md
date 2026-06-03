# Jenkins CI/CD for NexaBank

This document explains the minimal Jenkins pipeline and server deploy script included in this repo.

- Pipeline: [Jenkinsfile](Jenkinsfile)
- Deploy script (for EC2): [scripts/deploy.sh](scripts/deploy.sh)

1) Add a new Jenkins pipeline job and point it to this repository.

2) Use the provided `Jenkinsfile`. The pipeline performs:
   - Checkout
   - `docker compose build`
   - `docker compose down` + `docker compose up -d`

3) On the EC2 host, place this repo (clone) and ensure Docker & Docker Compose are installed. Run the deploy script to update the running stack:

```bash
cd /path/to/nexabank-cloud-banking/Zincbank
./scripts/deploy.sh
```

4) Edit `backend/.env` with your production values (MongoDB Atlas URI, JWT secrets, email creds) before running the script the first time.

Notes:
- The `Jenkinsfile` runs shell commands, so Jenkins must run on an agent that has Docker and Docker Compose (or use SSH to run on the EC2 host).
- Protect secrets using Jenkins credentials and environment injection; do not commit secrets to the repo.
