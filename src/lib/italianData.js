export const REGIONI = [
  "Abruzzo", "Basilicata", "Calabria", "Campania", "Emilia-Romagna",
  "Friuli Venezia Giulia", "Lazio", "Liguria", "Lombardia", "Marche",
  "Molise", "Piemonte", "Puglia", "Sardegna", "Sicilia",
  "Toscana", "Trentino-Alto Adige", "Umbria", "Valle d'Aosta", "Veneto"
];

export const PROVINCE_BY_REGIONE = {
  "Abruzzo": ["L'Aquila", "Chieti", "Pescara", "Teramo"],
  "Basilicata": ["Matera", "Potenza"],
  "Calabria": ["Catanzaro", "Cosenza", "Crotone", "Reggio Calabria", "Vibo Valentia"],
  "Campania": ["Avellino", "Benevento", "Caserta", "Napoli", "Salerno"],
  "Emilia-Romagna": ["Bologna", "Ferrara", "Forlì-Cesena", "Modena", "Parma", "Piacenza", "Ravenna", "Reggio Emilia", "Rimini"],
  "Friuli Venezia Giulia": ["Gorizia", "Pordenone", "Trieste", "Udine"],
  "Lazio": ["Frosinone", "Latina", "Rieti", "Roma", "Viterbo"],
  "Liguria": ["Genova", "Imperia", "La Spezia", "Savona"],
  "Lombardia": ["Bergamo", "Brescia", "Como", "Cremona", "Lecco", "Lodi", "Mantova", "Milano", "Monza e Brianza", "Pavia", "Sondrio", "Varese"],
  "Marche": ["Ancona", "Ascoli Piceno", "Fermo", "Macerata", "Pesaro e Urbino"],
  "Molise": ["Campobasso", "Isernia"],
  "Piemonte": ["Alessandria", "Asti", "Biella", "Cuneo", "Novara", "Torino", "Verbano-Cusio-Ossola", "Vercelli"],
  "Puglia": ["Bari", "Barletta-Andria-Trani", "Brindisi", "Foggia", "Lecce", "Taranto"],
  "Sardegna": ["Cagliari", "Nuoro", "Oristano", "Sassari", "Sud Sardegna"],
  "Sicilia": ["Agrigento", "Caltanissetta", "Catania", "Enna", "Messina", "Palermo", "Ragusa", "Siracusa", "Trapani"],
  "Toscana": ["Arezzo", "Firenze", "Grosseto", "Livorno", "Lucca", "Massa-Carrara", "Pisa", "Pistoia", "Prato", "Siena"],
  "Trentino-Alto Adige": ["Bolzano", "Trento"],
  "Umbria": ["Perugia", "Terni"],
  "Valle d'Aosta": ["Aosta"],
  "Veneto": ["Belluno", "Padova", "Rovigo", "Treviso", "Venezia", "Verona", "Vicenza"]
};

export const CREDIT_PACKAGES = [
  {
    id: "beta",
    price_id: "price_1TbgLXLyFVq8L2LAeoECufB1",
    name: "BETA",
    price: 2.90,
    queries: 1,
    description: "Prova UrbiCheck a prezzo speciale",
    badge: "Fase Beta",
    popular: false,
  },
  {
    id: "singola",
    price_id: "price_1TYMpKLyFVq8L2LAu5vrVYJb",
    name: "SINGOLA",
    price: 9.90,
    queries: 1,
    description: "Un'analisi completa, senza impegno",
    popular: false,
  },
  {
    id: "starter",
    price_id: "price_1TbgJJLyFVq8L2LAeYJAXKu6",
    name: "STARTER",
    price: 29.70,
    queries: 3,
    description: "3 analisi, risparmi il 16%",
    popular: false,
  },
  {
    id: "pro",
    price_id: "price_1TbgKBLyFVq8L2LAxMA6TlTj",
    name: "PRO",
    price: 49.50,
    queries: 5,
    description: "5 analisi, risparmi il 18%",
    badge: "Più popolare",
    popular: true,
  },
  {
    id: "business",
    price_id: "price_1TZrnJLyFVq8L2LAnQJOOnOR",
    name: "BUSINESS",
    price: 99.00,
    queries: 10,
    description: "10 analisi, risparmi il 25%",
    popular: false,
  },
];