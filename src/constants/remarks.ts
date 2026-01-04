type RemarkCategory = "EXCELLENT" | "GOOD" | "AVERAGE" | "POOR";

// We map levels to their specific remarks
export const REMARK_BANK: Record<string, Record<RemarkCategory, string[]>> = {
  // 👶 KG / NURSERY (Focus: Social, Motor Skills, Play)
  KG: {
    EXCELLENT: [
      "Interacts beautifully with peers. Very active in singing and creative arts.",
      "Can recite rhymes and poems confidently. A happy child.",
      "Motor skills are well developed. Writes numbers and letters neatly.",
      "Very neat and tidy. Always willing to share toys with friends.",
      "Participates actively in class activities. A joy to watch.",
    ],
    GOOD: [
      "Coming up well. Needs to improve on pencil grip.",
      "Good social skills. Needs to be encouraged to speak up more.",
      "Can identify basic shapes and colors. Making steady progress.",
      "Polite and obedient. Needs to eat all his/her food during break.",
      "Plays well with others but can be a bit rough sometimes.",
    ],
    AVERAGE: [
      "Still struggling with letter recognition. Needs flashcards at home.",
      "Very quiet. Needs encouragement to join in group play.",
      "Handwriting is shaky. Needs more practice with tracing.",
      "Easily distracted during circle time. Needs to sit still.",
      "Cries often when separated from parents. Needs to build confidence.",
    ],
    POOR: [
      "Refuses to participate in class activities. Very withdrawn.",
      "Does not follow simple instructions. Needs patience and firmness.",
      "Disturbs other children during lessons. Needs to learn sharing.",
      "Speech development is slow. Parents should engage him/her more.",
      "Always sleeping in class. Please ensure he/she sleeps early at home.",
    ],
  },

  // 🎒 PRIMARY (Focus: Foundation, Reading, Playfulness)
  Primary: {
    // Note: Matching your "Primary" spelling
    EXCELLENT: [
      "An outstanding pupil! Reads fluently and writes beautifully.",
      "Very respectful and disciplined. A role model to the class.",
      "Excellent results. Approaches homework with great seriousness.",
      "Mastery of Mathematics and English is impressive. Keep it up!",
      "Always punctual and neat. A delight to teach.",
    ],
    GOOD: [
      "A good performance. Handwriting needs a little polish.",
      "Reads well but struggles with spelling. Needs more dictation practice.",
      "Good effort. Needs to stop making noise in class.",
      "Perform well, but playfulness is affecting his/her full potential.",
      "Respectful child. Needs to be faster when copying notes.",
    ],
    AVERAGE: [
      "Often too playful. Needs to sit up!",
      "Average performance. Needs to read more storybooks at home.",
      "Handwriting is difficult to read. Needs a copybook for practice.",
      "Talks too much in class. Needs to focus on the teacher.",
      "Forgetful with homework. Needs a structured timetable at home.",
    ],
    POOR: [
      "Very weak in reading. Cannot form simple sentences yet.",
      "Fighting in class is becoming a problem. Needs discipline.",
      "Always absent or late. This is affecting his/her grades seriously.",
      "Does not pay attention. Parents must visit the school.",
      "Laziness is the main problem. He/She must wake up!",
    ],
  },

  // 📘 JHS (Focus: BECE Prep, Adolescence, Seriousness)
  JHS: {
    EXCELLENT: [
      "A potential aggregate 6 candidate! disciplined and focused.",
      "Exceptional analysis of questions. Ready for the next level.",
      "Demonstrates great maturity. A strong prefect material.",
      "Excellent results. Should begin solving past questions seriously.",
      "Highly commended. Balances academics and extracurriculars well.",
    ],
    GOOD: [
      "Good performance, but Mathematics requires more practice.",
      "Has the potential for a single digit grade if he/she focuses.",
      "Good student, but sometimes succumbs to peer pressure.",
      "Needs to take Integrated Science more seriously.",
      "Attitude to work has improved. Needs to maintain this momentum.",
    ],
    AVERAGE: [
      "Inconsistent. One day serious, the next day playful.",
      "Too much pidgin speaking is affecting his/her English composition.",
      "Needs to cut down on friends and focus on books.",
      "Average results. Not yet ready for the rigor of BECE.",
      "Lacks confidence in answering questions. Needs to study more.",
    ],
    POOR: [
      "Not serious at all. BECE is around the corner!",
      "Truancy is a major issue. Parents must intervene immediately.",
      "Disrespectful to teachers. Attitude must change.",
      "Homework is rarely done. He/She is joking with his/her future.",
      "Very poor foundation. Extra classes are highly recommended.",
    ],
  },

  // 🎓 SHS (Focus: WASSCE, Electives, Leadership)
  SHS: {
    EXCELLENT: [
      "An exceptional scholar. Mastery of elective subjects is top-notch.",
      "University material! Demonstrates critical thinking skills.",
      "Outstanding leadership and academic prowess. Keep it up.",
      "Consistently delivers A-grade work. A pride to the school.",
      "Excellent research skills. Ready for tertiary education.",
    ],
    GOOD: [
      "Good grasp of core subjects, but Electives need attention.",
      "A solid performance. Needs to manage time better during exams.",
      "Good student, but needs to refrain from breaking school rules.",
      "Has improved significantly. Needs to aim for straight As.",
      "Participates well, but needs to refine essay writing skills.",
    ],
    AVERAGE: [
      "Complacency is setting in. Needs to rediscover his/her drive.",
      "Average performance. Needs to attend prep hours seriously.",
      "Distracted by social activities. WASSCE requires total focus.",
      "Struggling with the volume of work. Needs a better study plan.",
      "Potential is there, but lack of discipline is a barrier.",
    ],
    POOR: [
      "On the path to failure if attitude doesn't change instantly.",
      "Class attendance is appalling. You cannot pass without being in class.",
      "Zero commitment to studies. Needs a serious reality check.",
      "Constantly dodging assignments. This will lead to problems.",
      "Very weak. Parents/Guardians need to meet the Housemaster.",
    ],
  },
};
