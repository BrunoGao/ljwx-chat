import { Suspense } from 'react';

import Loading from '@/components/Loading/BrandTextLoading';

import SignUpBox from './SignUpBox';

export default () => (
  <Suspense fallback={<Loading />}>
    <SignUpBox />
  </Suspense>
);
