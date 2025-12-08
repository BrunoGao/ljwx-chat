'use client';

import { DOCUMENTS_REFER_URL, PRIVACY_URL, TERMS_URL } from '@lobechat/const';
import { Button, Text } from '@lobehub/ui';
import { LobeHub } from '@lobehub/ui/brand';
import { Col, Flex, Form, Input, Row, message } from 'antd';
import { createStyles } from 'antd-style';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import BrandWatermark from '@/components/BrandWatermark';
import { lambdaQuery } from '@/libs/trpc/client';

const useStyles = createStyles(({ css, token }) => ({
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

interface ForgotPasswordFormValues {
  email: string;
}

export default memo(() => {
  const { styles } = useStyles();
  const { t } = useTranslation('clerk');
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [form] = Form.useForm<ForgotPasswordFormValues>();

  const { mutateAsync: requestPasswordReset } =
    lambdaQuery.localAuth.requestPasswordReset.useMutation();

  const handleRequestReset = async (values: ForgotPasswordFormValues) => {
    setLoading(true);
    try {
      await requestPasswordReset({ email: values.email });
      setEmailSent(true);
      message.success('Password reset email sent! Please check your inbox.');
    } catch (error: any) {
      setLoading(false);
      message.error(error.message || 'Failed to send reset email. Please try again.');
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
              Forgot Password
            </Text>
            <Text as={'p'} className={styles.description}>
              {emailSent
                ? 'Check your email for reset instructions'
                : 'Enter your email to reset your password'}
            </Text>
          </div>
          {/* Content */}
          {!emailSent ? (
            <Form form={form} layout="vertical" onFinish={handleRequestReset}>
              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { message: 'Please enter your email', required: true },
                  { message: 'Please enter a valid email', type: 'email' },
                ]}
              >
                <Input placeholder="email@example.com" size="large" type="email" />
              </Form.Item>

              <Form.Item>
                <Button block htmlType="submit" loading={loading} size="large" type="primary">
                  Send Reset Link
                </Button>
              </Form.Item>

              <Flex justify="center">
                <Text as={'span'} className={styles.description}>
                  Remember your password?{' '}
                  <Link href="/next-auth/signin">
                    <Button size="small" type="link">
                      Sign In
                    </Button>
                  </Link>
                </Text>
              </Flex>
            </Form>
          ) : (
            <Flex gap="middle" vertical>
              <Text as={'p'} className={styles.description} style={{ textAlign: 'center' }}>
                We&apos;ve sent a password reset link to{' '}
                <strong>{form.getFieldValue('email')}</strong>. Please check your inbox and follow
                the instructions.
              </Text>
              <Button block onClick={() => router.push('/next-auth/signin')} size="large">
                Back to Sign In
              </Button>
            </Flex>
          )}
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
