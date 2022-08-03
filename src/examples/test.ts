function b(a: any) {
  console.log(a?.['a']?.['b'] == undefined ? [] : a?.['a']?.['b']);
}

b({});
b({
  a: {
    b: 'yeees',
  },
});
