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
    id: "starter",
    price_id: "price_1TZrnJLyFVq8L2LAyYXq0y8u",
    name: "Starter",
    price: 25.00,
    credits: 25,
    description: "circa 2 report da €9,90",
    popular: false,
  },
  {
    id: "pro",
    price_id: "price_1TZrnJLyFVq8L2LAKICk86H0",
    name: "Pro",
    price: 55.00,
    credits: 55,
    description: "circa 5-6 report da €9,90",
    popular: true,
  },
  {
    id: "business",
    price_id: "price_1TZrnJLyFVq8L2LAnQJOOnOR",
    name: "Business",
    price: 99.00,
    credits: 99,
    description: "circa 10 report da €9,90",
    popular: false,
  },
];