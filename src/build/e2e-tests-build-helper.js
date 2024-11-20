import replace from 'replace-in-file';

const replaceOptions = [
  {
    files: './dist/web/examples/zkapps/**/*.js',
    from: /from 'o1js'/g,
    to: "from '../../../index.js'",
  },
  {
    files: './dist/web/examples/zkprogram/*.js',
    from: /from 'o1js'/g,
    to: "from '../../index.js'",
  },
];

async function performReplacement(options) {
  try {
    const results = await replace(options);
    console.log(`Replacement results for ${options.files}:`, results);
  } catch (error) {
    console.error(`Error occurred while replacing in ${options.files}:`, error);
  }
}

async function main() {
  for (const options of replaceOptions) {
    await performReplacement(options);
  }
}

main();
