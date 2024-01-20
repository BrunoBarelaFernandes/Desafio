from flask import Flask, request, jsonify
from flask_restful import Resource, Api
from flask_cors import CORS
import pandas as pd
import numpy as np
from io import BytesIO

app = Flask(__name__)
api = Api(app)
CORS(app)

class SubscriptionMetrics(Resource):
    def post(self):
        try:
            file = request.files['file']
            # Ler a planilha usando pandas
            df = pd.read_excel(BytesIO(file.read()))

            # Mapear os nomes das colunas
            column_mapping = {
                'quantidade cobranças': 'quantidade',
                'cobrada a cada X dias': 'dias',
                'data início': 'data_inicio',
                'status': 'status',
                'data status': 'data_status',
                'data cancelamento': 'data_cancelamento',
                'valor': 'valor',
                'próximo ciclo': 'proximo_ciclo',
                'ID assinante': 'id_assinante'
            }

            # Renomear as colunas para corresponder ao esperado
            df = df.rename(columns=column_mapping)

            # Tratar valores nulos nas colunas de data usando numpy
            df = df.replace({pd.NaT: None})

            # Calcular as métricas
            mrr = df['valor'].sum()
            churn_rate = len(df[df['status'] == 'Cancelada']) / len(df) * 100

            # Obter mais informações da planilha
            data = df.to_dict(orient='records')

            # Retornar as métricas calculadas e os dados da planilha
            response_data = {'MRR': mrr, 'ChurnRate': churn_rate, 'data': data}
            return jsonify(response_data)
        except Exception as e:
            print('Erro no upload do arquivo:', e)
            return {'error': 'Erro no servidor'}, 500

api.add_resource(SubscriptionMetrics, '/subscriptions/upload')

if __name__ == '__main__':
    app.run(port=3001, debug=True)
