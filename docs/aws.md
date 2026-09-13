# AWS

Run `npm start` (HTTP RPC) on EC2, ECS, or Elastic Beanstalk. Optional: put miners on a separate ASG so the API task is not a hash farm.

```bash
NHC_PORT=18732 npm start
```

Health check: `GET /status`.
