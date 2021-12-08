// API - MAZEBANK


//Vamos importar o módulo mongoose que fará a interface entre o node.js e o banco da dados mongobd.
const mongoose = require('mongoose');



//Importação do bcrypt para a criptografia de senhas.
const bcrypt = require("bcrypt");



//Importação do json web token
//Pay-load -> chave-secreta | tempo de expiração | método de criptografia
const jwt = require("jsonwebtoken");
const { request } = require("express");
const cfn = require("./confSenha");
const { jwt_expires, jwt_key } = require("./confSenha")



//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Banco de dados ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//Este é o local de conexão com o banco de dados la no site do "clound.mongobd.
//Na segunda linha eu vou pegar o modulo do mongoouse e vou conectar ao banco de dados do mongobd.
const url = "mongodb+srv://guilhermevfs:guilherme123@clustercliente.yaa0v.mongodb.net/apimazebank?retryWrites=true&w=majority";
mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });

//Local de criação das tabelas.
const tableCliente = mongoose.Schema({
    nomeCliente: { type: String, require: true },
    idadeCliente: { type: String, require: true },
    emailCliente: { type: String, require: true, unique: true },
    cpfCliente: { type: String, require: true, unique: true },
    senhaCliente: { type: String, require: true }
});

//Junto ao cadastro, o bcrypt irá criptografar o campo da senha através desse código(  pre("save").  ).
tableCliente.pre('save', function (next) {
    let cliente = this;
    if (!cliente.isModified('senhaCliente')) return next()
    bcrypt.hash(cliente.senhaCliente, 10, (erro, resultCryp) => {
        if (erro) return console.log(`Erro ao gerar a senha ->${erro}`);
        cliente.senhaCliente = resultCryp;
        return next();
    })
});
//Aqui é aomde iremos EXECUTAR a tabela.
const Cliente = mongoose.model("dbcliente", tableCliente)
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Fim do banco de dados ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~





//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Servidor express ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//Importação módulo express, que irá executar tarefas no desenvolvimento do servidor.
const express = require('express');

//Importação do módulo cors, que irá fazer o http aceitar o código js.
const cors = require('cors');

//Referência do servidor express
const appExpress = express();

//Aqui faremos com que o servidor express irá receber e tratar dados no formato de json
appExpress.use(express.json());

//Aqui falamos para o servidor usar o módulo cors.
appExpress.use(cors());
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Fim do servidor express ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~




//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ CRUD ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
/*
Abaixo, iremos criar as 4 rotas para os verbos GET, POST, PUT, DELETE:
    GET -> Requisição e resposta do servidor
    POST -> Cadastro de dados 
    PUT -> Atualizar algum dado sobre um objeto
    DELETE -> Apagar algum dado sobre um objeto

    E ao final das rotas iremos aplicar ao servidor, uma porta de comunicação, no nosso caso será a porta 3000(porta padrão).
*/
// ----------> MÉTODO GET
appExpress.get("/apimazebank/cliente/", (req, res) => {
    Cliente.find((erro, dados) => {
        if (erro) {
            return res.status(400).send({ mensagem: `Erro ao tentar ler o cliente: ${erro}` });
        }
        res.status(200).send({ mensagem: dados })
    });
});

// ----------> POST
appExpress.post("/apimazebank/cliente/cadastro", (req, res) => {
    const cliente = new Cliente(req.body);
    cliente.save().then(() => {
        return res.send(cliente);
        //const gerado = criaToken(req.body, res.body.nome);
        res.status(201).send({ mensagem: `Cliente cadastrado`})
    })
        .catch((erro) => res.status(400).send({ mensagem: `Erro ao tentar cadastrar o cliente`, mensagem: erro }))
});
appExpress.post("/apimazebank/cliente/login", (req, res) => {
    const cpf = req.body.cpfCliente;
    const pw = req.body.senhaCliente;
    Cliente.findOne({ cpfCliente: cpf }, (erro, dados) => {
        if (erro) {
            return res.status(400).send({ mensagem: `Usuário não encontrado:${erro}` })
        }
        bcrypt.compare(pw, dados.senhaCliente, (erro, igual) => {
            if (erro) return res.status(400).send({ mensagem: `erro ao tentar logar:${erro}` });
            if (!igual) return res.status(400).send({ mensagem: `erro ao tentar logar:${erro}` });
            const gerado = criaToken(dados.cpfCliente, dados.cpfCliente);
            res.status(200).send({ mensagem: `Logado`, token: gerado, payload: dados });

        });
    })
});
// ----------> PUT
appExpress.put("apimazebank/cliente/atualizar/:id", (req, res) => {
    Cliente.findByIdAndUpdate(req.params.id, req.body, (erro, _dados) => {
        if (erro) {
            return res.status(400).send({ mensagem })
        }
        res.status(200).send({ mensagem: `Dados atualizados` })
    })
});

// ----------> DELETE
appExpress.delete("apimazebank/cliente/deletar/:id", (req, res) => {
    Cliente.findByIdAndDelete(req.params.id, (erro, _dados) => {
        if (erro) {
            return res.status(400).send({ mensagem: `Erro ao tentar apagar o cliente:${erro}` })
        }
        res.status(204).send({ mensagem: "Cliente apagado" });
    })
});
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ fim do CRUD ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~


//Teste do jsonwebtoken, que cria um token e envia ao lugar de destino
const criaToken = (cpfCliente, nome) => {
    return jwt.sign({ cpfCliente: cpfCliente, nome: nome }, cfn.jwt_key, { expiresIn: cfn.jwt_expires });
}


//Validação do token
function jwpVerifica(req, res, next) {
    const tokenGerado = req.headers.token;
    if (!tokenGerado) {
        return res.status(401).send({ mensagem: `Requisição negada! Você não possui um Token` })


    }
    jwt.verify(tokenGerado, cfn.jwt_key, (erro, dados) => {

        if (erro) {
            return res.status(401).send({ mensagem: "token inválido" });
        }
        next();
    })
}
appExpress.listen(3001, () => console.log("Servidor online em http://localhost:3001"));