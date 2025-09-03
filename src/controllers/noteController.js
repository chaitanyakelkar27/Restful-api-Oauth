exports.getNotes = async (req, res) => {
  res.json([
    { id: 1, title: "First Note", body: "This is secure!" },
    { id: 2, title: "Second Note", body: "Protected by JWT" },
  ]);
};
