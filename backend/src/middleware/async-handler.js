/** Express 4 does not catch rejected promises from async route handlers — use this wrapper. */
function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    const out = fn(req, res, next);
    if (out && typeof out.catch === "function") {
      out.catch(next);
    }
    return out;
  };
}

module.exports = { asyncHandler };
