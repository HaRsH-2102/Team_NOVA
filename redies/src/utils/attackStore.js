let attackLogs = [];

function addAttack(log) {
  attackLogs.unshift(log);

  // Keep last 100 logs only
  if (attackLogs.length > 100) {
    attackLogs.pop();
  }
}

function getAttacks() {
  return attackLogs;
}

module.exports = { addAttack, getAttacks };