import replace from 'replace-in-file';

const options = {
  files: './dist/web/examples/zkapps/**/*.js',
  from: /from 'snarkyjs'/g,
  to: "from '../../../index.js'",
};

try {
  const results = await replace(options);
  console.log('Replacement results:', results);
} catch (error) {
  console.error('Error occurred:', error);
}
