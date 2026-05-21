document.getElementById("program-form").addEventListener("submit", (e) => {
  e.preventDefault();

  const numWorkouts = parseInt(document.getElementById("num-workouts").value, 10);

  const program = {
    title:    document.getElementById("title").value.trim(),
    numWeeks: parseInt(document.getElementById("num-weeks").value, 10),
    workouts: Array(numWorkouts).fill(null),
  };

  const programs = JSON.parse(localStorage.getItem("pt_programs") || "[]");
  programs.push(program);
  localStorage.setItem("pt_programs", JSON.stringify(programs));

  window.location.href = `program.html?idx=${programs.length - 1}`;
});
