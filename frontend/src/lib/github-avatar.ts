// Avatar URL that serves CORS headers (github.com/<login>.png redirects without them).
// Plain module, so server and client components can both call it.
export const githubAvatarUrl = (login: string, size = 96) =>
  `https://avatars.githubusercontent.com/${login}?size=${size}`
