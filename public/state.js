const DEFAULT_SKILLS={mental:45,voice:35,boundary:40,situation:30,safety:50};
const S={
 page:localStorage.getItem('anakberani_page')||localStorage.getItem('berani_page')||'home',
 mode:localStorage.getItem('anakberani_mode')||localStorage.getItem('berani_mode')||'parent',
 xp:Number(localStorage.getItem('anakberani_xp')||localStorage.getItem('berani_xp')||80),
 streak:Number(localStorage.getItem('anakberani_streak')||localStorage.getItem('berani_streak')||3),
 completed:JSON.parse(localStorage.getItem('anakberani_completed')||localStorage.getItem('berani_completed')||'[]'),
 days:JSON.parse(localStorage.getItem('anakberani_days')||localStorage.getItem('berani_days')||'[]'),
 incidents:JSON.parse(localStorage.getItem('anakberani_incidents')||localStorage.getItem('berani_incidents')||'[]'),
 checkins:JSON.parse(localStorage.getItem('anakberani_checkins')||localStorage.getItem('berani_checkins')||'[]'),
 skills:JSON.parse(localStorage.getItem('anakberani_skills')||localStorage.getItem('berani_skills')||JSON.stringify(DEFAULT_SKILLS)),
 simSet:'dasar',simIndex:0,simAnswered:false,lesson:null,parentTab:'training',programDay:null,programAnswers:JSON.parse(localStorage.getItem('anakberani_programAnswers')||'{}'),programNotes:JSON.parse(localStorage.getItem('anakberani_programNotes')||'{}'),programChecks:JSON.parse(localStorage.getItem('anakberani_programChecks')||'{}')
};
