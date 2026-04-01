-- =====================================================
-- CloudTrail Athena Table Schema
-- =====================================================
-- Run this in the AWS Athena console to create the table
-- that this dashboard queries against.
--
-- Prerequisites:
--   1. CloudTrail is enabled and delivering logs to S3
--   2. You know your S3 bucket name and account ID
--   3. Replace the placeholders below before running
-- =====================================================

CREATE DATABASE IF NOT EXISTS cloudtrail_logs;

CREATE EXTERNAL TABLE IF NOT EXISTS cloudtrail_logs.cloudtrail_events (
    eventversion STRING,
    useridentity STRUCT<
        type: STRING,
        principalid: STRING,
        arn: STRING,
        accountid: STRING,
        invokedby: STRING,
        accesskeyid: STRING,
        username: STRING,
        sessioncontext: STRUCT<
            attributes: STRUCT<
                mfaauthenticated: STRING,
                creationdate: STRING
            >,
            sessionissuer: STRUCT<
                type: STRING,
                principalid: STRING,
                arn: STRING,
                accountid: STRING,
                username: STRING
            >
        >
    >,
    eventtime STRING,
    eventsource STRING,
    eventname STRING,
    awsregion STRING,
    sourceipaddress STRING,
    useragent STRING,
    errorcode STRING,
    errormessage STRING,
    requestparameters STRING,
    responseelements STRING,
    additionaleventdata STRING,
    requestid STRING,
    eventid STRING,
    resources ARRAY<STRUCT<
        arn: STRING,
        accountid: STRING,
        type: STRING
    >>,
    eventtype STRING,
    apiversion STRING,
    readonly STRING,
    recipientaccountid STRING,
    serviceeventdetails STRING,
    sharedeventid STRING,
    vpcendpointid STRING
)
COMMENT 'CloudTrail table for the CloudTrail Dashboard'
ROW FORMAT SERDE 'org.apache.hive.hcatalog.data.JsonSerDe'
STORED AS INPUTFORMAT 'com.amazon.emr.cloudtrail.CloudTrailInputFormat'
OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat'
LOCATION 's3://YOUR_CLOUDTRAIL_BUCKET/AWSLogs/YOUR_ACCOUNT_ID/CloudTrail/'
TBLPROPERTIES ('classification'='cloudtrail');

-- =====================================================
-- Optional: Create a partitioned table for better perf
-- =====================================================
-- If your CloudTrail logs are organized by region/date,
-- use partitions to avoid full-table scans.

CREATE EXTERNAL TABLE IF NOT EXISTS cloudtrail_logs.cloudtrail_events_partitioned (
    eventversion STRING,
    useridentity STRUCT<
        type: STRING,
        principalid: STRING,
        arn: STRING,
        accountid: STRING,
        invokedby: STRING,
        accesskeyid: STRING,
        username: STRING,
        sessioncontext: STRUCT<
            attributes: STRUCT<
                mfaauthenticated: STRING,
                creationdate: STRING
            >,
            sessionissuer: STRUCT<
                type: STRING,
                principalid: STRING,
                arn: STRING,
                accountid: STRING,
                username: STRING
            >
        >
    >,
    eventtime STRING,
    eventsource STRING,
    eventname STRING,
    awsregion STRING,
    sourceipaddress STRING,
    useragent STRING,
    errorcode STRING,
    errormessage STRING,
    requestparameters STRING,
    responseelements STRING,
    additionaleventdata STRING,
    requestid STRING,
    eventid STRING,
    resources ARRAY<STRUCT<
        arn: STRING,
        accountid: STRING,
        type: STRING
    >>,
    eventtype STRING,
    apiversion STRING,
    readonly STRING,
    recipientaccountid STRING,
    serviceeventdetails STRING,
    sharedeventid STRING,
    vpcendpointid STRING
)
PARTITIONED BY (region STRING, year STRING, month STRING, day STRING)
ROW FORMAT SERDE 'org.apache.hive.hcatalog.data.JsonSerDe'
STORED AS INPUTFORMAT 'com.amazon.emr.cloudtrail.CloudTrailInputFormat'
OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat'
LOCATION 's3://YOUR_CLOUDTRAIL_BUCKET/AWSLogs/YOUR_ACCOUNT_ID/CloudTrail/'
TBLPROPERTIES ('classification'='cloudtrail');

-- Load partitions automatically:
-- MSCK REPAIR TABLE cloudtrail_logs.cloudtrail_events_partitioned;
