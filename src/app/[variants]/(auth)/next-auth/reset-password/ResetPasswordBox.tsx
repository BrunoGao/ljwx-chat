'use client';

import { DOCUMENTS_REFER_URL, PRIVACY_URL, TERMS_URL } from '@lobechat/const';
import { Button, Text } from '@lobehub/ui';
import { LobeHub } from '@lobehub/ui/brand';
import { Col, Flex, Form, Input, Row, message } from 'antd';
import { createStyles } from 'antd-style';
import { useRouter, useSearchParams } from 'next/navigation';
import { memo, useEffect, useState } from 'react';
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

interface ResetPasswordFormValues {
  confirmPassword: string;
  password: string;
}

export default memo(() => {
  const { styles } = useStyles();
  const { t } = useTranslation('clerk');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [passwordReset, setPasswordReset] = useState(false);
  const [form] = Form.useForm<ResetPasswordFormValues>();

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      message.error('Invalid or missing reset token');
      setTimeout(() => {
        router.push('/next-auth/forgot-password');
      }, 2000);
    }
  }, [token, router]);

  const { mutateAsync: resetPassword } = lambdaQuery.localAuth.resetPassword.useMutation();

  const handleResetPassword = async (values: ResetPasswordFormValues) => {
    if (!token) return;

    setLoading(true);
    try {
      await resetPassword({
        password: values.password,
        token,
      });
      setPasswordReset(true);
      message.success('Password reset successfully! Redirecting to sign in...');
      setTimeout(() => {
        router.push('/next-auth/signin');
      }, 2000);
    } catch (error: any) {
      setLoading(false);
      message.error(error.message || 'Failed to reset password. Please try again.');
    }
  };

  const footerBtns = [
    { href: DOCUMENTS_REFER_URL, id: 0, label: t('footerPageLink__help') },
    { href: PRIVACY_URL, id: 1, label: t('footerPageLink__privacy') },
    { href: TERMS_URL, id: 2, label: t('footerPageLink__terms') },
  ];

  if (!token) {
    return null;
  }

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
              Reset Password
            </Text>
            <Text as={'p'} className={styles.description}>
              {passwordReset ? 'Password reset successful' : 'Enter your new password'}
            </Text>
          </div>
          {/* Content */}
          {!passwordReset ? (
            <Form form={form} layout="vertical" onFinish={handleResetPassword}>
              <Form.Item
                label="New Password"
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
                  Reset Password
                </Button>
              </Form.Item>
            </Form>
          ) : (
            <Flex gap="middle" vertical>
              <Text as={'p'} className={styles.description} style={{ textAlign: 'center' }}>
                Your password has been reset successfully. You will be redirected to the sign in
                page shortly.
              </Text>
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
