async function sagaFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: "include"
  });

  if (response.status === 401) {
    window.location.href = "/";
    throw new Error("No autenticado");
  }

  return response;
}
