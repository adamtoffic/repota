export interface SecurityQuestion {
  id: string;
  question: string;
  placeholder: string;
}

export const SECURITY_QUESTIONS: SecurityQuestion[] = [
  {
    id: "teacher_training",
    question: "What teacher training college did you attend?",
    placeholder: "e.g., OLA College of Education",
  },
  {
    id: "first_school",
    question: "What was the name of the first school you taught at?",
    placeholder: "e.g., Kumasi Academy",
  },
  {
    id: "hometown",
    question: "What is your hometown or village?",
    placeholder: "e.g., Takoradi",
  },
  {
    id: "secondary_school",
    question: "What secondary school did you attend?",
    placeholder: "e.g., Prempeh College",
  },
  {
    id: "primary_school",
    question: "What was the name of your primary school?",
    placeholder: "e.g., Ridge Church School",
  },
  {
    id: "fathers_hometown",
    question: "What is your father's hometown?",
    placeholder: "e.g., Accra",
  },
  {
    id: "mothers_hometown",
    question: "What is your mother's hometown?",
    placeholder: "e.g., Cape Coast",
  },
  {
    id: "first_subject",
    question: "What was the first subject you taught?",
    placeholder: "e.g., Mathematics",
  },
  {
    id: "favorite_dish",
    question: "What is your favorite Ghanaian dish?",
    placeholder: "e.g., Jollof Rice",
  },
  {
    id: "day_name",
    question: "What is your day name (traditional name)?",
    placeholder: "e.g., Kofi, Akua",
  },
  {
    id: "childhood_friend",
    question: "What is the name of your childhood best friend?",
    placeholder: "e.g., Kwame",
  },
  {
    id: "first_mentor",
    question: "What is the name of your first teaching mentor or headteacher?",
    placeholder: "e.g., Mr. Mensah",
  },
];
