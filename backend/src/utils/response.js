export const sendSuccess = (res, data = {}, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data,
  });
};

export const sendError = (res, message = 'Something went wrong', statusCode = 500, errors = null) => {
  const responseBody = {
    success: false,
    message,
  };
  
  if (errors) {
    responseBody.errors = errors;
  }
  
  return res.status(statusCode).json(responseBody);
};
