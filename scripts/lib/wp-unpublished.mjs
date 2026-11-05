/**
 * WordPress answers an anonymous REST read of a draft or private page with
 * 401 rest_forbidden. Meg setting a page to Draft is content, not an outage,
 * so a build reads that answer as "this page is unpublished" and carries on.
 *
 * The check is narrow on purpose. Any other failure, including a 401 with
 * another code, keeps failing the build with its named cause.
 *
 * Callers return from `withRetry` on a true result, so a draft costs no retry
 * window. Pure: no fetch inside, so it is tested without a network.
 */
export async function isUnpublishedPage(res) {
  if (res.status !== 401) return false;
  try {
    const body = await res.clone().json();
    return body?.code === "rest_forbidden";
  } catch {
    return false;
  }
}
