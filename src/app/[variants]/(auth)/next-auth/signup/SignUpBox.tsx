'use client';

import { BRANDING_NAME, DOCUMENTS_REFER_URL, PRIVACY_URL, TERMS_URL } from '@lobechat/const';
import { Button, Text } from '@lobehub/ui';
import { LobeHub } from '@lobehub/ui/brand';
import { Col, Flex, Form, Input, Row, message } from 'antd';
import { createStyles } from 'antd-style';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import BrandWatermark from '@/components/BrandWatermark';
import { lambdaQuery } from '@/libs/trpc/client';

const useStyles = createStyles(({ css, token }) => ({
  button: css`
    text-transform: capitalize;
  `,
  container: css`
    min-width: 360px;
    border: 1px solid ${token.colorBorder};
    border-radius: ${token.borderRadiusLG}px;
    background: ${token.colorBgContainer};
  `,
  contentCard: css`
    padding-block: 2.5rem;
    padding-inline: 2rem;
  `,
  description: css`
    margin: 0;
    color: ${token.colorTextSecondary};
  `,
  footer: css`
    padding: 1rem;
    border-block-start: 1px solid ${token.colorBorder};
    border-radius: 0 0 8px 8px;

    color: ${token.colorTextDescription};

    background: ${token.colorBgElevated};
  `,
  text: css`
    text-align: center;
  `,
  title: css`
    margin: 0;
    color: ${token.colorTextHeading};
  `,
}));

interface SignUpFormValues {
  confirmPassword: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  password: string;
  username: string;
}

export default memo(() => {
  const { styles } = useStyles();
  const { t } = useTranslation('clerk');
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm<SignUpFormValues>();

  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/';

  const { mutateAsync: registerWithUsername } =
    lambdaQuery.localAuth.registerWithUsername.useMutation();
  const { mutateAsync: registerWithEmail } = lambdaQuery.localAuth.registerWithEmail.useMutation();

  const handleSignUp = async (values: SignUpFormValues) => {
    setLoading(true);
    try {
      // Register with email if provided, otherwise with username
      if (values.email) {
        await registerWithEmail({
          email: values.email,
          firstName: values.firstName,
          lastName: values.lastName,
          password: values.password,
          username: values.username,
        });
        message.success('Account created! Please check your email to verify your account.');
      } else {
        await registerWithUsername({
          firstName: values.firstName,
          lastName: values.lastName,
          password: values.password,
          username: values.username,
        });
        message.success('Account created successfully! You can now sign in.');
      }

      // Auto sign in after registration (only for username-based registration)
      if (!values.email) {
        await signIn('credentials', {
          identifier: values.username,
          password: values.password,
          redirectTo: callbackUrl,
        });
      } else {
        // Redirect to sign in page for email-based registration
        setTimeout(() => {
          router.push(`/next-auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
        }, 2000);
      }
    } catch (error: any) {
      setLoading(false);
      message.error(error.message || 'Failed to create account. Please try again.');
    }
  };

  const footerBtns = [
    { href: DOCUMENTS_REFER_URL, id: 0, label: t('footerPageLink__help') },
    { href: PRIVACY_URL, id: 1, label: t('footerPageLink__privacy') },
    { href: TERMS_URL, id: 2, label: t('footerPageLink__terms') },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.contentCard}>
        {/* Card Body */}
        <Flex gap="large" vertical>
          {/* Header */}
          <div className={styles.text}>
            <Text as={'h4'} className={styles.title}>
              <div>
                <LobeHub size={48} />
              </div>
              Create Account
            </Text>
            <Text as={'p'} className={styles.description}>
              Sign up for {BRANDING_NAME}
            </Text>
          </div>
          {/* Content */}
          <Form form={form} layout="vertical" onFinish={handleSignUp}>
            <Form.Item
              label="Username"
              name="username"
              rules={[
                { message: 'Please enter a username', required: true },
                {
                  message: 'Username must be at least 3 characters',
                  min: 3,
                },
              ]}
            >
              <Input placeholder="username" size="large" />
            </Form.Item>

            <Form.Item
              label="Email (Optional)"
              name="email"
              rules={[{ message: 'Please enter a valid email', type: 'email' }]}
            >
              <Input placeholder="email@example.com" size="large" type="email" />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="First Name (Optional)" name="firstName">
                  <Input placeholder="John" size="large" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Last Name (Optional)" name="lastName">
                  <Input placeholder="Doe" size="large" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              label="Password"
              name="password"
              rules={[
                { message: 'Please enter a password', required: true },
                {
                  message:
                    'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
                  min: 8,
                },
              ]}
            >
              <Input.Password placeholder="••••••••" size="large" />
            </Form.Item>

            <Form.Item
              dependencies={['password']}
              label="Confirm Password"
              name="confirmPassword"
              rules={[
                { message: 'Please confirm your password', required: true },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Passwords do not match'));
                  },
                }),
              ]}
            >
              <Input.Password placeholder="••••••••" size="large" />
            </Form.Item>

            <Form.Item>
              <Button block htmlType="submit" loading={loading} size="large" type="primary">
                Create Account
              </Button>
            </Form.Item>

            <Flex justify="center">
              <Text as={'span'} className={styles.description}>
                Already have an account?{' '}
                <Link href="/next-auth/signin">
                  <Button size="small" type="link">
                    Sign In
                  </Button>
                </Link>
              </Text>
            </Flex>
          </Form>
        </Flex>
      </div>
      <div className={styles.footer}>
        {/* Footer */}
        <Row>
          <Col span={12}>
            <Flex justify="left" style={{ height: '100%' }}>
              <BrandWatermark />
            </Flex>
          </Col>
          <Col offset={4} span={8}>
            <Flex justify="right">
              {footerBtns.map((btn) => (
                <Button key={btn.id} onClick={() => router.push(btn.href)} size="small" type="text">
                  {btn.label}
                </Button>
              ))}
            </Flex>
          </Col>
        </Row>
      </div>
    </div>
  );
});
