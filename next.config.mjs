import path from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  output: 'standalone',
  allowedDevOrigins: ['10.126.69.90', 'localhost'],
  turbopack: {
    root: path.resolve('.'),
  },
};

export default nextConfig;
