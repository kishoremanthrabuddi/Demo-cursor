const RISK_RULES = [
  {
    id: 'root-activity',
    name: 'Root User Activity',
    severity: 'HIGH',
    description: 'AWS root account was used to perform an action',
    match: (event) =>
      event.user_type === 'Root' || event.user_arn?.includes(':root'),
  },
  {
    id: 'failed-login',
    name: 'Failed Console Login',
    severity: 'HIGH',
    description: 'A console login attempt failed',
    match: (event) =>
      event.eventname === 'ConsoleLogin' &&
      event.errorcode != null &&
      event.errorcode !== '',
  },
  {
    id: 'iam-policy-change',
    name: 'IAM Policy Change',
    severity: 'MEDIUM',
    description: 'An IAM policy was created, modified, or deleted',
    match: (event) => {
      const iamPolicyEvents = [
        'CreatePolicy',
        'DeletePolicy',
        'CreatePolicyVersion',
        'DeletePolicyVersion',
        'AttachUserPolicy',
        'DetachUserPolicy',
        'AttachRolePolicy',
        'DetachRolePolicy',
        'AttachGroupPolicy',
        'DetachGroupPolicy',
        'PutUserPolicy',
        'DeleteUserPolicy',
        'PutRolePolicy',
        'DeleteRolePolicy',
        'PutGroupPolicy',
        'DeleteGroupPolicy',
      ];
      return (
        event.eventsource === 'iam.amazonaws.com' &&
        iamPolicyEvents.includes(event.eventname)
      );
    },
  },
  {
    id: 'security-group-change',
    name: 'Security Group Modification',
    severity: 'MEDIUM',
    description: 'A VPC security group was created, modified, or deleted',
    match: (event) => {
      const sgEvents = [
        'AuthorizeSecurityGroupIngress',
        'AuthorizeSecurityGroupEgress',
        'RevokeSecurityGroupIngress',
        'RevokeSecurityGroupEgress',
        'CreateSecurityGroup',
        'DeleteSecurityGroup',
      ];
      return (
        event.eventsource === 'ec2.amazonaws.com' &&
        sgEvents.includes(event.eventname)
      );
    },
  },
  {
    id: 'unauthorized-access',
    name: 'Unauthorized Access Attempt',
    severity: 'HIGH',
    description: 'An API call was denied due to insufficient permissions',
    match: (event) =>
      event.errorcode === 'AccessDenied' ||
      event.errorcode === 'UnauthorizedAccess' ||
      event.errorcode === 'Client.UnauthorizedAccess',
  },
  {
    id: 'mfa-disabled',
    name: 'MFA Device Change',
    severity: 'MEDIUM',
    description: 'An MFA device was deactivated or deleted',
    match: (event) => {
      const mfaEvents = ['DeactivateMFADevice', 'DeleteVirtualMFADevice'];
      return (
        event.eventsource === 'iam.amazonaws.com' &&
        mfaEvents.includes(event.eventname)
      );
    },
  },
  {
    id: 'nacl-change',
    name: 'Network ACL Change',
    severity: 'LOW',
    description: 'A network ACL entry was created or modified',
    match: (event) => {
      const naclEvents = [
        'CreateNetworkAclEntry',
        'ReplaceNetworkAclEntry',
        'DeleteNetworkAclEntry',
      ];
      return (
        event.eventsource === 'ec2.amazonaws.com' &&
        naclEvents.includes(event.eventname)
      );
    },
  },
];

function assessRisk(event) {
  const findings = [];
  for (const rule of RISK_RULES) {
    if (rule.match(event)) {
      findings.push({
        ruleId: rule.id,
        name: rule.name,
        severity: rule.severity,
        description: rule.description,
      });
    }
  }
  return findings;
}

function getHighestSeverity(findings) {
  const order = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  let highest = null;
  for (const f of findings) {
    if (!highest || order[f.severity] > order[highest]) {
      highest = f.severity;
    }
  }
  return highest;
}

function enrichEventsWithRisk(events) {
  return events.map((event) => {
    const findings = assessRisk(event);
    const severity = getHighestSeverity(findings);
    return {
      ...event,
      risk: {
        findings,
        severity,
        hasRisk: findings.length > 0,
      },
    };
  });
}

module.exports = { assessRisk, enrichEventsWithRisk, getHighestSeverity, RISK_RULES };
