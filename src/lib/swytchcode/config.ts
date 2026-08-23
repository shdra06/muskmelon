// src/lib/swytchcode/config.ts
export const toolingConfig = {
  version: '1.0',
  tools: [
    'notion',
    'gmail',
    'github',
    'slack',
    'resend'
  ]
};

export const policiesConfig = {
  rules: [
    { action: 'read', resource: 'notion.*', effect: 'allow' },
    { action: 'read', resource: 'github.*', effect: 'allow' },
    { action: 'send', resource: 'gmail.*', effect: 'require_approval' },
    { action: 'post', resource: 'slack.*', effect: 'require_approval' },
    { action: 'delete', resource: '*', effect: 'deny' }
  ]
};
