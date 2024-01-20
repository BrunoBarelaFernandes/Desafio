import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import Chart from 'chart.js/auto';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import './App.css'; // Importa o arquivo de estilo CSS

const App = () => {
  const [file, setFile] = useState(null);
  const [showUserIDs, setShowUserIDs] = useState(false);
  const [rawData, setRawData] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post('http://localhost:3001/subscriptions/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Dados do backend:', response.data);

      // Salvar dados brutos do backend
      setRawData(response.data.data);

      // Chame a função para criar o gráfico com os dados do backend
      createChart(response.data.data);
    } catch (error) {
      console.error('Erro ao fazer upload do arquivo:', error);
    }
  };

  const toggleShowUserIDs = () => {
    setShowUserIDs(!showUserIDs);
  };

  const createChart = (chartData) => {
    // Agrupar os dados por mês
    const dataByMonth = chartData.reduce((acc, item) => {
      const monthYear = format(new Date(item.data_inicio), 'MMMM yyyy', { locale: ptBR });

      if (!acc[monthYear]) {
        acc[monthYear] = { MRR: 0, ChurnRate: 0, userIDs: {} };
      }

      acc[monthYear].MRR += item.valor || 0;
      acc[monthYear].ChurnRate += item.status === 'Cancelada' ? 1 : 0;

      if (!acc[monthYear].userIDs[item.id_assinante]) {
        acc[monthYear].userIDs[item.id_assinante] = 1;
      } else {
        acc[monthYear].userIDs[item.id_assinante]++;
      }

      return acc;
    }, {});

    // Obter rótulos de meses ordenados
    const labels = Object.keys(dataByMonth).sort((a, b) => new Date(a) - new Date(b));

    // Processamento dos dados para o gráfico
    const datasets = [
      {
        label: 'MRR',
        data: labels.map((month) => dataByMonth[month].MRR.toFixed(2)),
        backgroundColor: 'rgba(75, 192, 192, 0.7)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
      {
        label: 'Churn Rate',
        data: labels.map(
          (month) => ((dataByMonth[month].ChurnRate / Object.keys(dataByMonth[month].userIDs).length) * 100 || 0).toFixed(2)
        ),
        backgroundColor: 'rgba(255, 99, 132, 0.7)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
        yAxisID: 'churnRateAxis',
      },
      {
        label: 'User IDs',
        data: labels.map((month) => (showUserIDs ? Object.keys(dataByMonth[month].userIDs).length : 0)),
        backgroundColor: 'rgba(255, 205, 86, 0.7)',
        borderColor: 'rgba(255, 205, 86, 1)',
        borderWidth: 1,
        yAxisID: 'userIDsAxis',
      },
    ];

    // Crie ou atualize o gráfico
    const ctx = chartContainer.current.getContext('2d');

    // Destrua a instância do gráfico existente
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // Crie uma nova instância do gráfico
    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: datasets,
      },
      options: {
        scales: {
          x: {
            stacked: true,
          },
          y: {
            stacked: true,
            beginAtZero: true,
          },
          churnRateAxis: {
            type: 'linear',
            position: 'right',
            min: 0,
            max: 100,
            scaleLabel: {
              display: true,
              labelString: 'Churn Rate (%)',
            },
          },
          userIDsAxis: {
            type: 'linear',
            position: 'right',
            scaleLabel: {
              display: true,
              labelString: 'User IDs',
            },
          },
        },
        plugins: {
          tooltip: {
            callbacks: {
              title: (tooltipItems) => tooltipItems[0].label,
              label: (context) => {
                const datasetLabel = context.dataset.label || '';
                const value = context.parsed.y;

                return `${datasetLabel}: ${value}`;
              },
            },
          },
        },
      },
    });
  };

  const chartContainer = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    // Limpar o gráfico ao desmontar o componente
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, []); // Executar somente uma vez durante a montagem

  // Atualizar o gráfico quando o estado showUserIDs mudar
  useEffect(() => {
    if (rawData) {
      createChart(rawData);
    }
  }, [showUserIDs, rawData]);

  return (
    <div className="container">
      <div className="upload-section">
        <div className="file-input-container">
          <label htmlFor="fileInput" className="custom-file-input">
            Escolher arquivo
          </label>
          <input type="file" id="fileInput" className="file-input" onChange={handleFileChange} />
          <button className="upload-btn" onClick={handleUpload}>
            Montar gráfico
          </button>
        </div>
      </div>
      <div className="toggle-btn-section">
        <button className={`toggle-btn ${showUserIDs ? 'warning' : 'secondary'}`} onClick={toggleShowUserIDs}>
          {showUserIDs ? 'Ocultar IDs de Usuário' : 'Mostrar IDs de Usuário'}
        </button>
      </div>
  
      {/* Renderize o canvas do gráfico ou a mensagem */}
      {rawData && rawData.length > 0 ? (
        <canvas ref={chartContainer} width={800} height={300}></canvas>
      ) : (
        <p className="no-data-message">Não há dados para exibir o gráfico.</p>
      )}
    </div>
  );
};

export default App;
