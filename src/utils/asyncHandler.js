const asyncHandler = (requstHandler) => {
  return (req, res, next) => {
    Promise.resolve(requstHandler(req, res, next)).catch((error) =>
      next(error)
    );
  };
};
export { asyncHandler };
