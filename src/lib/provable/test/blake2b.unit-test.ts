import { ZkProgram } from '../../proof-system/zkprogram.js';
import { Bytes } from '../wrapped-classes.js';
import { Gadgets } from '../gadgets/gadgets.js';
import { blake2b as nobleBlake2b } from '@noble/hashes/blake2b';
import { bytes } from './test-utils.js';
import {
  equivalentAsync,
  equivalentProvable,
} from '../../testing/equivalent.js';
import { Random, sample } from '../../testing/random.js';
import { expect } from 'expect';

sample(Random.nat(400), 5).forEach((preimageLength) => {
  let inputBytes = bytes(preimageLength);
  let outputBytes = bytes(256 / 8);

  equivalentProvable({ from: [inputBytes], to: outputBytes, verbose: true })(
    (x) => nobleBlake2b(x),
    (x) => Gadgets.BLAKE2B.hash(x),
    `blake2b preimage length ${preimageLength}`
  );
});

for (let { digest_length, preimage, hash } of testVectors()) {
  let inputBytes = bytes(preimage.length);
  let outputBytes = bytes(digest_length);
  equivalentProvable({ from: [inputBytes], to: outputBytes, verbose: true })(
    () => Bytes.fromHex(hash).toBytes(),
    (x) => Gadgets.BLAKE2B.hash(Bytes.fromString(preimage), digest_length),
    `provable: blake2b preimage length ${preimage.length}`
  );
}

const BLAKE2BProgram = ZkProgram({
  name: `blake2b`,
  publicOutput: Bytes(64),
  methods: {
    blake2b: {
      privateInputs: [Bytes(192)],
      async method(preImage: Bytes) {
        return { publicOutput: Gadgets.BLAKE2B.hash(preImage) };
      },
    },
  },
});

const RUNS = 2;

await BLAKE2BProgram.compile();

await equivalentAsync(
  {
    from: [bytes(192)],
    to: bytes(64),
  },
  { runs: RUNS }
)(nobleBlake2b, async (x) => {
  const { proof } = await BLAKE2BProgram.blake2b(x);
  await BLAKE2BProgram.verify(proof);
  return proof.publicOutput;
});


function testVectors() {
  return [
    {
      digest_length: 32,
      preimage: 'The quick brown fox jumps over the lazy dog',
      hash: '01718cec35cd3d796dd00020e0bfecb473ad23457d063b75eff29c0ffa2e58a9',
    },
    {
      digest_length: 32,
      preimage: 'o1js',
      hash: '2b8198c64ceccbf2863835a07be336da04479cf0bd460565526e916367b77988',
    },
    {
      digest_length: 32,
      preimage: '',
      hash: '0e5751c026e543b2e8ab2eb06099daa1d1e5df47778f7787faab45cdf12fe3a8',
    },
    {
      digest_length: 32,
      preimage: '0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b',
      hash: 'fa30f36c826e6bf4531e79e01f12e7f773e7ab62bd1ffd38cf0e950eaf5c0434',
    },
    {
      digest_length: 32,
      preimage: '4a656665',
      hash: 'b009ba3a88866add8b55de6cc8c040370a09022dc3f80afce090d81b0d8eded4',
    },
    {
      digest_length: 32,
      preimage: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      hash: '5c3c8bdd63c262d014180d9d54d797946c921fa65f02703c33bca7062e1829c1',
    },
    {
      digest_length: 32,
      preimage:
        'Lorem ipsum odor amet, consectetuer adipiscing elit. Laoreet purus himenaeos blandit lectus blandit porta leo rutrum dui sociosqu sit aliquet ad finibus consectetur quam justo finibus aptent molestie dapibus integer tellus nisi habitasse nascetur molestie mi etiam mauris habitant integer metus euismod adipiscing pretium fames massa massa habitant nulla himenaeos maximus porta natoque imperdiet metus ullamcorper auctor faucibus sit magna maximus ac at integer litora nam sem varius laoreet auctor magna quis metus sapien nam porttitor metus nascetur malesuada sapien aenean iaculis nisl tellus vel montes netus feugiat mi sollicitudin malesuada convallis semper tellus posuere erat phasellus est pharetra eleifend a maximus pharetra ultrices fames luctus vehicula egestas mollis hendrerit natoque pharetra congue fringilla dictum proin volutpat suspendisse leo volutpat odio ut egestas tellus ad lectus volutpat rutrum a hac dictumst rutrum nulla nullam magnis ridiculus maecenas nascetur curabitur conubia faucibus ac integer hendrerit sodales primis neque lacus ad blandit dapibus maximus sapien sapien felis potenti tempus rutrum augue metus ante nunc vulputate interdum dignissim cursus finibus malesuada elementum scelerisque lacinia habitasse aenean sociosqu dis facilisi integer ut elementum fames class penatibus sociosqu curabitur sed dui nostra odio ut dis etiam torquent velit porta conubia adipiscing taciti in est parturient nulla vestibulum ultricies vivamus sed inceptos morbi sem inceptos odio diam lectus massa pellentesque ligula dolor maximus venenatis varius nec dapibus faucibus ultrices penatibus rutrum montes curabitur euismod non nibh cursus quis ad diam quisque nisi scelerisque nibh placerat neque ut vitae leo vehicula mi donec phasellus dapibus ornare morbi lobortis maximus metus nullam maecenas dui hendrerit faucibus porttitor phasellus metus scelerisque hendrerit montes sollicitudin vehicula erat iaculis nisl blandit maecenas natoque finibus lorem maecenas fringilla posuere curae tempor torquent quis dapibus elementum hendrerit auctor torquent aliquam lobortis montes et aliquet aliquet adipiscing eros nisl nec porttitor a mattis ornare pharetra mauris aliquam suspendisse tincidunt nascetur sollicitudin porttitor vulputate donec imperdiet vel elementum scelerisque; cras a lacinia nullam consectetur natoque non integer cras duis eu torquent efficitur cursus bibendum torquent amet volutpat senectus eleifend ipsum consequat per tortor scelerisque eget mus facilisi sem habitant aliquam sodales arcu ultricies suspendisse mi dolor augue laoreet porttitor enim ullamcorper class varius enim posuere eros suspendisse fusce ex luctus lobortis duis vulputate quis quam porta dolor scelerisque porttitor aliquet congue varius primis nunc faucibus vestibulum erat faucibus neque himenaeos fusce euismod quis in feugiat curabitur arcu varius ullamcorper aenean lacus pulvinar odio a aliquet consequat interdum faucibus bibendum tempus ad augue taciti enim nisi nisl dui duis sem nunc tempus maecenas suspendisse porta senectus enim vivamus elit sapien imperdiet placerat nec inceptos malesuada egestas consectetur laoreet iaculis enim ac aenean odio duis malesuada tincidunt eros mattis iaculis montes eu felis penatibus consequat egestas quis fermentum ultricies tortor suscipit sagittis nisi justo dui dolor adipiscing magna id scelerisque eu sollicitudin class lobortis donec conubia morbi luctus donec natoque velit magna sit natoque ultricies natoque curabitur eu a mattis fermentum facilisi libero sapien pharetra tellus vitae ultrices a elit egestas posuere pharetra fames nascetur ex aenean ligula non amet ligula felis accumsan felis velit class accumsan dis non mus faucibus posuere nascetur. Lorem ipsum odor amet, consectetuer adipiscing elit. Laoreet purus himenaeos blandit lectus blandit porta leo rutrum dui sociosqu sit aliquet ad finibus consectetur quam justo finibus aptent molestie dapibus integer tellus nisi habitasse nascetur molestie mi etiam mauris habitant integer metus euismod adipiscing pretium fames massa massa habitant nulla himenaeos maximus porta natoque imperdiet metus ullamcorper auctor faucibus sit magna maximus ac at integer litora nam sem varius laoreet auctor magna quis metus sapien nam porttitor metus nascetur malesuada sapien aenean iaculis nisl tellus vel montes netus feugiat mi sollicitudin malesuada convallis semper tellus posuere erat phasellus est pharetra eleifend a maximus pharetra ultrices fames luctus vehicula egestas mollis hendrerit natoque pharetra congue fringilla dictum proin volutpat suspendisse leo volutpat odio ut egestas tellus ad lectus volutpat rutrum a hac dictumst rutrum nulla nullam magnis ridiculus maecenas nascetur curabitur conubia faucibus ac integer hendrerit sodales primis neque lacus ad blandit dapibus maximus sapien sapien felis potenti tempus rutrum augue metus ante nunc vulputate interdum dignissim cursus finibus malesuada elementum scelerisque lacinia habitasse aenean sociosqu dis facilisi integer ut elementum fames class penatibus sociosqu curabitur sed dui nostra odio ut dis etiam torquent velit porta conubia adipiscing taciti in est parturient nulla vestibulum ultricies vivamus sed inceptos morbi sem inceptos odio diam lectus massa pellentesque ligula dolor maximus venenatis varius nec dapibus faucibus ultrices penatibus rutrum montes curabitur euismod non nibh cursus quis ad diam quisque nisi scelerisque nibh placerat neque ut vitae leo vehicula mi donec phasellus dapibus ornare morbi lobortis maximus metus nullam maecenas dui hendrerit faucibus porttitor phasellus metus scelerisque hendrerit montes sollicitudin vehicula erat iaculis nisl blandit maecenas natoque finibus lorem maecenas fringilla posuere curae tempor torquent quis dapibus elementum hendrerit auctor torquent aliquam lobortis montes et aliquet aliquet adipiscing eros nisl nec porttitor a mattis ornare pharetra mauris aliquam suspendisse tincidunt nascetur sollicitudin porttitor vulputate donec imperdiet vel elementum scelerisque; cras a lacinia nullam consectetur natoque non integer cras duis eu torquent efficitur cursus bibendum torquent amet volutpat senectus eleifend ipsum consequat per tortor scelerisque eget mus facilisi sem habitant aliquam sodales arcu ultricies suspendisse mi dolor augue laoreet porttitor enim ullamcorper class varius enim posuere eros suspendisse fusce ex luctus lobortis duis vulputate quis quam porta dolor scelerisque porttitor aliquet congue varius primis nunc faucibus vestibulum erat faucibus neque himenaeos fusce euismod quis in feugiat curabitur arcu varius ullamcorper aenean lacus pulvinar odio a aliquet consequat interdum faucibus bibendum tempus ad augue taciti enim nisi nisl dui duis sem nunc tempus maecenas suspendisse porta senectus enim vivamus elit sapien imperdiet placerat nec inceptos malesuada egestas consectetur laoreet iaculis enim ac aenean odio duis malesuada tincidunt eros mattis iaculis montes eu felis penatibus consequat egestas quis fermentum ultricies tortor suscipit sagittis nisi justo dui dolor adipiscing magna id scelerisque eu sollicitudin class lobortis donec conubia morbi luctus donec natoque velit magna sit natoque ultricies natoque curabitur eu a mattis fermentum facilisi libero sapien pharetra tellus vitae ultrices a elit egestas posuere pharetra fames nascetur ex aenean ligula non amet ligula felis accumsan felis velit class accumsan dis non mus faucibus posuere nascetur. Lorem ipsum odor amet, consectetuer adipiscing elit. Laoreet purus himenaeos blandit lectus blandit porta leo rutrum dui sociosqu sit aliquet ad finibus consectetur quam justo finibus aptent molestie dapibus integer tellus nisi habitasse nascetur molestie mi etiam mauris habitant integer metus euismod adipiscing pretium fames massa massa habitant nulla himenaeos maximus porta natoque imperdiet metus ullamcorper auctor faucibus sit magna maximus ac at integer litora nam sem varius laoreet auctor magna quis metus sapien nam porttitor metus nascetur malesuada sapien aenean iaculis nisl tellus vel montes netus feugiat mi sollicitudin malesuada convallis semper tellus posuere erat phasellus est pharetra eleifend a maximus pharetra ultrices fames luctus vehicula egestas mollis hendrerit natoque pharetra congue fringilla dictum proin volutpat suspendisse leo volutpat odio ut egestas tellus ad lectus volutpat rutrum a hac dictumst rutrum nulla nullam magnis ridiculus maecenas nascetur curabitur conubia faucibus ac integer hendrerit sodales primis neque lacus ad blandit dapibus maximus sapien sapien felis potenti tempus rutrum augue metus ante nunc vulputate interdum dignissim cursus finibus malesuada elementum scelerisque lacinia habitasse aenean sociosqu dis facilisi integer ut elementum fames class penatibus sociosqu curabitur sed dui nostra odio ut dis etiam torquent velit porta conubia adipiscing taciti in est parturient nulla vestibulum ultricies vivamus sed inceptos morbi sem inceptos odio diam lectus massa pellentesque ligula dolor maximus venenatis varius nec dapibus faucibus ultrices penatibus rutrum montes curabitur euismod non nibh cursus quis ad diam quisque nisi scelerisque nibh placerat neque ut vitae leo vehicula mi donec phasellus dapibus ornare morbi lobortis maximus metus nullam maecenas dui hendrerit faucibus porttitor phasellus metus scelerisque hendrerit montes sollicitudin vehicula erat iaculis nisl blandit maecenas natoque finibus lorem maecenas fringilla posuere curae tempor torquent quis dapibus elementum hendrerit auctor torquent aliquam lobortis montes et aliquet aliquet adipiscing eros nisl nec porttitor a mattis ornare pharetra mauris aliquam suspendisse tincidunt nascetur sollicitudin porttitor vulputate donec imperdiet vel elementum scelerisque; cras a lacinia nullam consectetur natoque non integer cras duis eu torquent efficitur cursus bibendum torquent amet volutpat senectus eleifend ipsum consequat per tortor scelerisque eget mus facilisi sem habitant aliquam sodales arcu ultricies suspendisse mi dolor augue laoreet porttitor enim ullamcorper class varius enim posuere eros suspendisse fusce ex luctus lobortis duis vulputate quis quam porta dolor scelerisque porttitor aliquet congue varius primis nunc faucibus vestibulum erat faucibus neque himenaeos fusce euismod quis in feugiat curabitur arcu varius ullamcorper aenean lacus pulvinar odio a aliquet consequat interdum faucibus bibendum tempus ad augue taciti enim nisi nisl dui duis sem nunc tempus maecenas suspendisse porta senectus enim vivamus elit sapien imperdiet placerat nec inceptos malesuada egestas consectetur laoreet iaculis enim ac aenean odio duis malesuada tincidunt eros mattis iaculis montes eu felis penatibus consequat egestas quis fermentum ultricies tortor suscipit sagittis nisi justo dui dolor adipiscing magna id scelerisque eu sollicitudin class lobortis donec conubia morbi luctus donec natoque velit magna sit natoque ultricies natoque curabitur eu a mattis fermentum facilisi libero sapien pharetra tellus vitae ultrices a elit egestas posuere pharetra fames nascetur ex aenean ligula non amet ligula felis accumsan felis velit class accumsan dis non mus faucibus posuere nascetur. Lorem ipsum odor amet, consectetuer adipiscing elit. Laoreet purus himenaeos blandit lectus blandit porta leo rutrum dui sociosqu sit aliquet ad finibus consectetur quam justo finibus aptent molestie dapibus integer tellus nisi habitasse nascetur molestie mi etiam mauris habitant integer metus euismod adipiscing pretium fames massa massa habitant nulla himenaeos maximus porta natoque imperdiet metus ullamcorper auctor faucibus sit magna maximus ac at integer litora nam sem varius laoreet auctor magna quis metus sapien nam porttitor metus nascetur malesuada sapien aenean iaculis nisl tellus vel montes netus feugiat mi sollicitudin malesuada convallis semper tellus posuere erat phasellus est pharetra eleifend a maximus pharetra ultrices fames luctus vehicula egestas mollis hendrerit natoque pharetra congue fringilla dictum proin volutpat suspendisse leo volutpat odio ut egestas tellus ad lectus volutpat rutrum a hac dictumst rutrum nulla nullam magnis ridiculus maecenas nascetur curabitur conubia faucibus ac integer hendrerit sodales primis neque lacus ad blandit dapibus maximus sapien sapien felis potenti tempus rutrum augue metus ante nunc vulputate interdum dignissim cursus finibus malesuada elementum scelerisque lacinia habitasse aenean sociosqu dis facilisi integer ut elementum fames class penatibus sociosqu curabitur sed dui nostra odio ut dis etiam torquent velit porta conubia adipiscing taciti in est parturient nulla vestibulum ultricies vivamus sed inceptos morbi sem inceptos odio diam lectus massa pellentesque ligula dolor maximus venenatis varius nec dapibus faucibus ultrices penatibus rutrum montes curabitur euismod non nibh cursus quis ad diam quisque nisi scelerisque nibh placerat neque ut vitae leo vehicula mi donec phasellus dapibus ornare morbi lobortis maximus metus nullam maecenas dui hendrerit faucibus porttitor phasellus metus scelerisque hendrerit montes sollicitudin vehicula erat iaculis nisl blandit maecenas natoque finibus lorem maecenas fringilla posuere curae tempor torquent quis dapibus elementum hendrerit auctor torquent aliquam lobortis montes et aliquet aliquet adipiscing eros nisl nec porttitor a mattis ornare pharetra mauris aliquam suspendisse tincidunt nascetur sollicitudin porttitor vulputate donec imperdiet vel elementum scelerisque; cras a lacinia nullam consectetur natoque non integer cras duis eu torquent efficitur cursus bibendum torquent amet volutpat senectus eleifend ipsum consequat per tortor scelerisque eget mus facilisi sem habitant aliquam sodales arcu ultricies suspendisse mi dolor augue laoreet porttitor enim ullamcorper class varius enim posuere eros suspendisse fusce ex luctus lobortis duis vulputate quis quam porta dolor scelerisque porttitor aliquet congue varius primis nunc faucibus vestibulum erat faucibus neque himenaeos fusce euismod quis in feugiat curabitur arcu varius ullamcorper aenean lacus pulvinar odio a aliquet consequat interdum faucibus bibendum tempus ad augue taciti enim nisi nisl dui duis sem nunc tempus maecenas suspendisse porta senectus enim vivamus elit sapien imperdiet placerat nec inceptos malesuada egestas consectetur laoreet iaculis enim ac aenean odio duis malesuada tincidunt eros mattis iaculis montes eu felis penatibus consequat egestas quis fermentum ultricies tortor suscipit sagittis nisi justo dui dolor adipiscing magna id scelerisque eu sollicitudin class lobortis donec conubia morbi luctus donec natoque velit magna sit natoque ultricies natoque curabitur eu a mattis fermentum facilisi libero sapien pharetra tellus vitae ultrices a elit egestas posuere pharetra fames nascetur ex aenean ligula non amet ligula felis accumsan felis velit class accumsan dis non mus faucibus posuere nascetur.',
      hash: '04c03f5291f1cf01e26cfb542070124b84fec189b3aac443c187ca6a3f708a36',
    },
    {
      digest_length: 64,
      preimage: 'The quick brown fox jumps over the lazy dog',
      hash: 'a8add4bdddfd93e4877d2746e62817b116364a1fa7bc148d95090bc7333b3673f82401cf7aa2e4cb1ecd90296e3f14cb5413f8ed77be73045b13914cdcd6a918',
    },
    {
      digest_length: 64,
      preimage: 'o'.repeat(100000),
      hash: '95e19cef3822bdf0c2e7837a329b8c33612f225fceff67d7a4fab347d3ca25ecbfa1c2a1120f8f52b987696298186ec3dd6351c19bf31b4dbf972f6abde26ff4',
    },
    {
      digest_length: 64,
      preimage: 'o1js',
      hash: 'abe5652d5c204163a4b418b33577b8ccebd5a5ed3d8cbb9781e7ea4a1bc3344c9e5e5707112d656f642927a42d34f96439f68a1ff0a2aa621a3f1fbb2521b18f',
    },
    {
      digest_length: 64,
      preimage: '',
      hash: '786a02f742015903c6c6fd852552d272912f4740e15847618a86e217f71f5419d25e1031afee585313896444934eb04b903a685b1448b755d56f701afe9be2ce',
    },
    {
      digest_length: 64,
      preimage: '0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b',
      hash: 'df2dc4b30ffd789f70735464374974de018318e5fc1343ae23d38ecfc3cba32ce81db8f831d86da2d047dd76fd295a268a99ff7c890239b2cdc207357b723c92',
    },
    {
      digest_length: 64,
      preimage: '4a656665',
      hash: 'f56d7da03e8a385777bef77834ded67cbafba64c6fc32887e6bdcc36774b6fe398ddd1bb6b77d4529cfd709ca9973e4a5d2635f9a6d3abaea7e0a44655ac7a9b',
    },
    {
      digest_length: 64,
      preimage: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      hash: '0d5cf4c5c6e55752eb16eeda9052158fe59c964f9e9cef77c68580a65d40904f5c3639101d48a95001568a21ae6cfe0b0b405fb3d4f77255f308ec0eb07bc35a',
    },
  ];
}
