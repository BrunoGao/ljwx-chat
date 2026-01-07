import { Suspense } from 'react';

import Loading from '@/components/Loading/BrandTextLoading';

import ResetPasswordBox from './ResetPasswordBox';

export default () => (
  <Suspense fallback={<Loading />}>
    <ResetPasswordBox />
  </Suspense>
);
