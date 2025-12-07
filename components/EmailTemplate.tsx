import * as React from 'react';

interface PasswordResetEmailProps {
  resetLink: string;
  userName?: string;
  expiresIn?: string;
}

export function PasswordResetEmail({ 
  resetLink, 
  userName = "User",
  expiresIn = "1 hour"
}: PasswordResetEmailProps) {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <div style={{ backgroundColor: '#ec4899', padding: '20px', textAlign: 'center', borderRadius: '8px 8px 0 0' }}>
        <h1 style={{ color: '#ffffff', margin: 0, fontSize: '24px' }}>MomsCare</h1>
      </div>
      
      <div style={{ backgroundColor: '#f9fafb', padding: '30px', borderRadius: '0 0 8px 8px', border: '1px solid #e5e7eb' }}>
        <h2 style={{ color: '#111827', marginTop: 0, fontSize: '20px' }}>Password Reset Request</h2>
        
        <p style={{ color: '#374151', fontSize: '16px', lineHeight: '1.6' }}>
          Hello {userName},
        </p>
        
        <p style={{ color: '#374151', fontSize: '16px', lineHeight: '1.6' }}>
          We received a request to reset your password for your MomsCare account. Click the button below to reset your password:
        </p>
        
        <div style={{ textAlign: 'center', margin: '30px 0' }}>
          <a
            href={resetLink}
            style={{
              display: 'inline-block',
              backgroundColor: '#ec4899',
              color: '#ffffff',
              padding: '12px 30px',
              textDecoration: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              fontSize: '16px'
            }}
          >
            Reset Password
          </a>
        </div>
        
        <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.6' }}>
          Or copy and paste this link into your browser:
        </p>
        <p style={{ color: '#3b82f6', fontSize: '14px', wordBreak: 'break-all', backgroundColor: '#f3f4f6', padding: '10px', borderRadius: '4px' }}>
          {resetLink}
        </p>
        
        <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.6', marginTop: '20px' }}>
          This link will expire in {expiresIn}. If you didn't request a password reset, please ignore this email or contact support if you have concerns.
        </p>
        
        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '30px 0' }} />
        
        <p style={{ color: '#9ca3af', fontSize: '12px', lineHeight: '1.6', margin: 0 }}>
          This is an automated message from MomsCare. Please do not reply to this email.
        </p>
      </div>
    </div>
  );
}

