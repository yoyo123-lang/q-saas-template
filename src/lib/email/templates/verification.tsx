import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface VerificationEmailProps {
  name: string;
  verificationUrl: string;
  appName?: string;
}

export default function VerificationEmail({ name, verificationUrl, appName = 'Q App' }: VerificationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Verificá tu email en {appName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Verificá tu email</Heading>
          <Text style={text}>Hola {name},</Text>
          <Text style={text}>
            Hacé click en el botón para verificar tu cuenta en {appName}.
          </Text>
          <Section style={buttonSection}>
            <Button href={verificationUrl} style={button}>
              Verificar email
            </Button>
          </Section>
          <Text style={hint}>Este link expira en 24 horas.</Text>
          <Text style={footer}>{appName}</Text>
        </Container>
      </Body>
    </Html>
  );
}

const main: React.CSSProperties = {
  backgroundColor: '#f9fafb',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container: React.CSSProperties = {
  backgroundColor: '#ffffff',
  margin: '40px auto',
  padding: '40px',
  borderRadius: '8px',
  border: '1px solid #e5e7eb',
  maxWidth: '560px',
};

const heading: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: '600',
  color: '#111827',
  marginBottom: '16px',
};

const text: React.CSSProperties = {
  fontSize: '16px',
  color: '#374151',
  lineHeight: '24px',
  margin: '0 0 12px',
};

const buttonSection: React.CSSProperties = {
  textAlign: 'center',
  margin: '32px 0',
};

const button: React.CSSProperties = {
  backgroundColor: '#2563eb',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '6px',
  fontWeight: '600',
  fontSize: '16px',
  textDecoration: 'none',
};

const hint: React.CSSProperties = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '0 0 32px',
};

const footer: React.CSSProperties = {
  fontSize: '12px',
  color: '#9ca3af',
  borderTop: '1px solid #e5e7eb',
  paddingTop: '16px',
  margin: '0',
};
