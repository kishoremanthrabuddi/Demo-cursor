module.exports = {
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: process.env.AWS_ACCESS_KEY_ID
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
      : undefined, // falls back to default credential chain
  },
  athena: {
    database: process.env.ATHENA_DATABASE || 'cloudtrail_logs',
    table: process.env.ATHENA_TABLE || 'cloudtrail_events',
    outputBucket: process.env.ATHENA_OUTPUT_BUCKET,
    workGroup: process.env.ATHENA_WORKGROUP || 'primary',
  },
  server: {
    port: parseInt(process.env.PORT, 10) || 4000,
    env: process.env.NODE_ENV || 'development',
  },
};
