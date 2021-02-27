import express from 'express';
import dotenv from 'dotenv';
import session from 'express-session';
import passport from 'passport';
import { Strategy } from 'passport-local';
import { router as registrationRouter } from './registration.js';
import { router as adminRouter } from './admin.js';
import { utils } from './utils.js';
import { comparePasswords, findByUsername, findById } from './users.js';

dotenv.config();

const {
  PORT: port = process.env.port || 3000,
  SESSION_SECRET: sessionSecret,
  DATABASE_URL: connectionString,
} = process.env;

if (!connectionString || !sessionSecret) {
  console.error('Vantar gögn í env');
  process.exit(1);
}

const app = express();


app.use(express.urlencoded( {extended: true} ));
app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  maxAge: 7*24*60*1000,
}));

app.use(express.static('./public'));

app.set('views', './views');
app.set('view engine', 'ejs');
app.use('/', registrationRouter);
app.use('/admin', adminRouter);

/**
 * Checks if signature is anonymous and if so, anonimizes the signature
 * @param {*} signature 
 */
app.locals.anonymousSignature = function(signature) {
  return utils.formatSignature(signature);
}
app.locals.dateFormatter = function(date) {
  return utils.formatDate(date);
}

/**
 * Athugar hvort username og password sé til í notandakerfi.
 * Callback tekur við villu sem fyrsta argument, annað argument er
 * - `false` ef notandi ekki til eða lykilorð vitlaust
 * - Notandahlutur ef rétt
 *
 * @param {string} username Notandanafn til að athuga
 * @param {string} password Lykilorð til að athuga
 * @param {function} done Fall sem kallað er í með niðurstöðu
 */
async function strat(username, password, done) {
  try {
    console.log("finding user");
    const user = await findByUsername(username);

    if (!user) {
      return done(null, false);
    }

    // Verður annað hvort notanda hlutur ef lykilorð rétt, eða false
    const result = await comparePasswords(password, user);
    return done(null, result);
  } catch (err) {
    console.error(err);
    return done(err);
  }
}

// Notum local strategy með „strattinu“ okkar til að leita að notanda
passport.use(new Strategy(strat));

// getum stillt með því að senda options hlut með
// passport.use(new Strategy({ usernameField: 'email' }, strat));

// Geymum id á notanda í session, það er nóg til að vita hvaða notandi þetta er
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Sækir notanda út frá id
passport.deserializeUser(async (id, done) => {
  console.log("finding user");
  try {
    const user = await findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Látum express nota passport með session
app.use(passport.initialize());
app.use(passport.session());


// Gott að skilgreina eitthvað svona til að gera user hlut aðgengilegan í
// viewum ef við erum að nota þannig
app.use((req, res, next) => {
  if (req.isAuthenticated()) {
    // getum núna notað user í viewum
    res.locals.user = req.user;
  }

  next();
});

// Hjálpar middleware sem athugar hvort notandi sé innskráður og hleypir okkur
// þá áfram, annars sendir á /login
function ensureLoggedIn(req, res) {
  if (req.isAuthenticated()) {
    return res.redirect('/admin');
  }

  return res.redirect('/admin/login');
}

// app.get('/', (req, res) => {
//   if (req.isAuthenticated()) {
//     // req.user kemur beint úr users.js
//     return res.send(`
//       <p>Innskráður notandi er ${req.user.username}</p>
//       <p>Þú ert ${req.user.admin ? 'admin.' : 'ekki admin.'}</p>
//       <p><a href="/logout">Útskráning</a></p>
//       <p><a href="/admin">Skoða leyndarmál</a></p>
//     `);
//   }

//   return res.send(`
//     <p><a href="/login">Innskráning</a></p>
//   `);
// });

// ensureLoggedIn middleware passar upp á að aðeins innskráðir notendur geti
// skoðað efnið, aðrir lenda í redirect á /login, stillt í línu 103
app.get('/admin', ensureLoggedIn, (req, res) => {
  res.send(`
    <p>Hér eru leyndarmál</p>
    <p><a href="/">Forsíða</a></p>
  `);
});


// app.get('/login', (req, res) => {
//   if (req.isAuthenticated()) {
//     return res.redirect('/admin');
//   }

//   let message = '';

//   // Athugum hvort einhver skilaboð séu til í session, ef svo er birtum þau
//   // og hreinsum skilaboð
//   if (req.session.messages && req.session.messages.length > 0) {
//     message = req.session.messages.join(', ');
//     req.session.messages = [];
//   }

//   // Ef við breytum name á öðrum hvorum reitnum að neðan mun ekkert virka
//   // nema við höfum stillt í samræmi, sjá línu 64
//   return res.send(`
//     <form method="post" action="/login" autocomplete="off">
//       <label>Notendanafn: <input type="text" name="username"></label>
//       <label>Lykilorð: <input type="password" name="password"></label>
//       <button>Innskrá</button>
//     </form>
//     <p>${message}</p>
//   `);
// });

app.post(
  '/login',

  // Þetta notar strat að ofan til að skrá notanda inn
  passport.authenticate('local', {
    failureMessage: 'Notandanafn eða lykilorð vitlaust.',
    failureRedirect: '/admin/login',
  }),

  // Ef við komumst hingað var notandi skráður inn, senda á /admin
  (req, res) => {
    res.redirect('/admin');
  },
);

app.get('/logout', (req, res) => {
  // logout hendir session cookie og session
  req.logout();
  res.redirect('/');
});


/**
 * Middleware sem sér um 404 villur.
 *
 * @param {object} req Request hlutur
 * @param {object} res Response hlutur
 * @param {function} next Næsta middleware
 */
function notFoundHandler(req, res, next) { // eslint-disable-line
  const title = 'Fannst ekki';
  const message = 'Ó nei, efnið finnst ekki!';
  res.status(404).render('error', { title, message });
}

/**
 * Middleware sem sér um villumeðhöndlun.
 *
 * @param {object} err Villa sem kom upp
 * @param {object} req Request hlutur
 * @param {object} res Response hlutur
 * @param {function} next Næsta middleware
 */
function errorHandler(err, req, res, next) { // eslint-disable-line
  console.error(err);
  const title = 'Villa kom upp';
  const message = '';
  res.status(500).render('error', { title, message });
}

app.use(errorHandler);
app.use(notFoundHandler);

// Verðum að setja bara *port* svo virki á heroku
app.listen(port, () => {
  console.info(`Server running at http://localhost:${port}/`);
});
