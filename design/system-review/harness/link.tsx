// @ts-nocheck
import React, { forwardRef } from 'react';
import { hrefFor } from './navigation';
export default forwardRef(function Link(
  { href, children, prefetch, replace, scroll, locale, ...props },
  ref,
) {
  return (
    <a ref={ref} href={hrefFor(href)} {...props}>
      {children}
    </a>
  );
});
