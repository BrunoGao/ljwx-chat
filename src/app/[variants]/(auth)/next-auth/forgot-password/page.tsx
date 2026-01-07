import { Suspense } from 'react';

import Loading from '@/components/Loading/BrandTextLoading';

import ForgotPasswordBox from './ForgotPasswordBox';

export default () => (
  <Suspense fallback={<Loading />}>
    <ForgotPasswordBox />
  </Suspense>
);
