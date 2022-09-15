const logEvents = (message, eventsContainer) => {
  const dateNow = new Date().toLocaleString();
  const previousMessage = eventsContainer.innerHTML.replace(
    /No data available yet./g,
    ''
  );

  eventsContainer.innerHTML = `${dateNow} - ${message}<br>${previousMessage}`;
};

export { logEvents };
