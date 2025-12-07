import * as React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
  Heading,
} from '@react-email/components';

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
    <Html>
      <Head />
      <Body style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f3f4f6', padding: '20px' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '8px', overflow: 'hidden' }}>
          <Section style={{ backgroundColor: '#ec4899', padding: '20px', textAlign: 'center' }}>
            <Heading style={{ color: '#ffffff', margin: 0, fontSize: '24px' }}>MomsCare</Heading>
          </Section>
          
          <Section style={{ padding: '30px' }}>
            <Heading style={{ color: '#111827', marginTop: 0, fontSize: '20px' }}>Password Reset Request</Heading>
            
            <Text style={{ color: '#374151', fontSize: '16px', lineHeight: '1.6' }}>
              Hello {userName},
            </Text>
            
            <Text style={{ color: '#374151', fontSize: '16px', lineHeight: '1.6' }}>
              We received a request to reset your password for your MomsCare account. Click the button below to reset your password:
            </Text>
            
            <Section style={{ textAlign: 'center', margin: '30px 0' }}>
              <Button
                href={resetLink}
                style={{
                  backgroundColor: '#ec4899',
                  color: '#ffffff',
                  padding: '12px 30px',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  display: 'inline-block'
                }}
              >
                Reset Password
              </Button>
            </Section>
            
            <Text style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.6' }}>
              Or copy and paste this secure link into your browser:
            </Text>
            <Text style={{ color: '#3b82f6', fontSize: '14px', wordBreak: 'break-all', backgroundColor: '#f3f4f6', padding: '10px', borderRadius: '4px', fontFamily: 'monospace' }}>
              {resetLink}
            </Text>
            <Text style={{ color: '#059669', fontSize: '13px', lineHeight: '1.6', marginTop: '10px', fontWeight: '500' }}>
              🔒 This is a secure link from MomsCare. It's safe to click.
            </Text>
            
            <Text style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.6', marginTop: '20px' }}>
              This link will expire in {expiresIn}. If you didn't request a password reset, please ignore this email or contact support if you have concerns.
            </Text>
            
            <Hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '30px 0' }} />
            
            <Text style={{ color: '#9ca3af', fontSize: '12px', lineHeight: '1.6', margin: 0 }}>
              This is an automated message from MomsCare. Please do not reply to this email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

