export default {
  branches: [
    "main"
  ],
  plugins: [
    ['@semantic-release/commit-analyzer', {
      preset: 'angular',
      releaseRules: [
        // Dependabot and security updates use "build(deps)" commits, which the
        // default Angular rules ignore. Publish a patch release for them.
        { type: 'build', scope: 'deps', release: 'patch' },
        // Workflow changes matter for the published toolchain as well.
        { type: 'ci', release: 'patch' },
      ],
    }],
    '@semantic-release/release-notes-generator',
    '@semantic-release/npm',
    '@semantic-release/github',
  ],
};
