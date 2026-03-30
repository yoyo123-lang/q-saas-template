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

interface WelcomeEmailProps {
  name: string;
  loginUrl: string;
  appName: string;
}

export default function WelcomeEmail({ name, loginUrl, appName }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Bienvenido/a a {appName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Bienvenido/a a {appName}</Heading>
          <Text style={text}>Hola {name},</Text>
          <Text style={text}>
            Tu cuenta fue verificada. Ya podés empezar a usar {appName}.
          </Text>
          <Section style={buttonSection}>
            <Button href={loginUrl} style={button}>
              Ir al login
            </Button>
          </Section>
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

const footer: React.CSSProperties = {
  fontSize: '12px',
  color: '#9ca3af',
  borderTop: '1px solid #e5e7eb',
  paddingTop: '16px',
  margin: '0',
};
