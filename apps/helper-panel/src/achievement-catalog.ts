export const achievementCatalog: Record<string,{name:readonly [string,string];description:readonly [string,string];path:string}> = {
  messages: {name:["Conversation starter", "À conversa"],description:["Send messages in the server", "Envia mensagens no servidor"],path:"M-15-12H15V7H-4L-13 15V7H-15Z"},
  voice: {name:["Stay awhile", "Fica mais um pouco"],description:["Spend time in voice channels", "Passa tempo nos canais de voz"],path:"M-16 5V-5A16 16 0 0 1 16-5V5M-16 0H-9V13H-16ZM9 0H16V13H9Z"},
  reactions: {name:["Reaction master", "Mestre das reações"],description:["Add reactions to messages", "Adiciona reações a mensagens"],path:"M-15 0A15 15 0 1 0 15 0A15 15 0 1 0-15 0M-7-4H-5M5-4H7M-7 5Q0 13 7 5"},
  threads_created: {name:["Thread creator", "Criador de tópicos"],description:["Create threads in the server", "Cria tópicos no servidor"],path:"M-7-16L-11 16M8-16L4 16M-17-6H17M-17 7H17"},
  threads_joined: {name:["Thread explorer", "Explorador de tópicos"],description:["Participate in different threads", "Participa em tópicos diferentes"],path:"M-15-10H15V13H-15ZM-6-15V-5M6-15V-5M-7 4L-1 10L10-1"},
  boost: {name:["Server supporter", "Apoiante do servidor"],description:["Boost the server", "Impulsiona o servidor"],path:"M2-19L-12 3H0L-3 20L14-4H3Z"},
  xp: {name:["XP milestones", "Marcos de XP"],description:["Earn XP in the server", "Ganha XP no servidor"],path:"M-15-12L-5 0L-15 12M15-12L5 0L15 12"},
};
