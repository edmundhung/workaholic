
export let setupBuild = () => {
  return entries => ({
    test: entries,
  });
};

export let setupQuery = () => {
  return query => (namespace, slug) => {
    switch (namespace) {
      case 'foo':
        return query('test', `foo/${slug}`);
      default:
        return query(namespace, slug);
    }
  };
};
