package com.joao_v_marques.dashboard_esg.cooperative_members.dashboard;

import com.joao_v_marques.dashboard_esg.cooperative_members.dashboard.dto.CooperativeMemberDashboardResponse;
import com.joao_v_marques.dashboard_esg.cooperative_members.dashboard.dto.MemberTrainingResponse;
import com.joao_v_marques.dashboard_esg.cooperative_members.dashboard.dto.PointsBandResponse;
import com.joao_v_marques.dashboard_esg.cooperative_members.dashboard.dto.TrainedInCooperativismResponse;
import com.joao_v_marques.dashboard_esg.integrations.certificados_cooperados.CertificadosCooperadosClient;
import com.joao_v_marques.dashboard_esg.integrations.certificados_cooperados.dto.AnnualReport;
import com.joao_v_marques.dashboard_esg.integrations.certificados_cooperados.dto.BandsReport;
import com.joao_v_marques.dashboard_esg.integrations.certificados_cooperados.dto.Occurrence;
import com.joao_v_marques.dashboard_esg.integrations.certificados_cooperados.dto.SatisfactionSurvey;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Year;
import java.util.Comparator;
import java.util.List;

@Service
public class CooperativeMemberDashboardService {

    private final CertificadosCooperadosClient certificadosCooperadosClient;

    public CooperativeMemberDashboardService(CertificadosCooperadosClient certificadosCooperadosClient) {
        this.certificadosCooperadosClient = certificadosCooperadosClient;
    }

    public CooperativeMemberDashboardResponse getDashboard(Integer year) {
        int baseYear = (year != null) ? year : Year.now().getValue();

        BandsReport bandsReport = certificadosCooperadosClient.findBandsReport(baseYear);
        AnnualReport annualReport = certificadosCooperadosClient.findAnnualReport(baseYear);
        List<SatisfactionSurvey> surveys = certificadosCooperadosClient.findSatisfactionSurveys();
        List<Occurrence> occurrences = certificadosCooperadosClient.findOccurrences();

        return new CooperativeMemberDashboardResponse(
                baseYear,
                annualReport.availableYears() != null ? annualReport.availableYears() : List.of(baseYear),
                membersByPointsBand(bandsReport),
                trainedInCooperativism(annualReport),
                trainingByMember(annualReport),
                satisfactionIndex(surveys, baseYear),
                registeredOccurrences(occurrences, baseYear)
        );
    }

    private List<PointsBandResponse> membersByPointsBand(BandsReport bandsReport) {
        return bandsReport.bands()
                .stream()
                .map(band -> new PointsBandResponse(
                        band.band(),
                        band.lowerBoundPercent(),
                        band.upperBoundPercent(),
                        band.memberCount(),
                        percentage(band.memberCount(), bandsReport.totalMembers())))
                .toList();
    }

    private TrainedInCooperativismResponse trainedInCooperativism(AnnualReport annualReport) {
        int trained = annualReport.membersTrainedInCooperativism();
        int total = annualReport.totalMembers();

        return new TrainedInCooperativismResponse(trained, total, percentage(trained, total));
    }

    // Sai do mesmo /annual-report do card de capacitados: o indicador não custa chamada a mais ao certificados-cooperados.
    // A lista traz todos os cooperados ativos, quem não lançou curso no ano aparece zerado
    private List<MemberTrainingResponse> trainingByMember(AnnualReport annualReport) {
        // Maior carga primeiro; o desempate por nome mantém a ordem estável entre cargas iguais
        // (e é a ordem inteira enquanto totalMinutes não existir do outro lado)
        Comparator<MemberTrainingResponse> byMinutesDesc = Comparator.comparingInt(
                (MemberTrainingResponse member) -> member.totalMinutes() != null ? member.totalMinutes() : 0).reversed();

        return annualReport.members()
                .stream()
                .map(member -> new MemberTrainingResponse(member.name(), member.totalCourses(), member.totalMinutes()))
                .sorted(byMinutesDesc.thenComparing(MemberTrainingResponse::memberName))
                .toList();
    }

    // /satisfaction-surveys não filtra por ano, filtra aqui. Sem pesquisa do ano o indicador vem null
    private BigDecimal satisfactionIndex(List<SatisfactionSurvey> surveys, int year) {
        return surveys.stream()
                .filter(survey -> survey.surveyYear() == year)
                .map(SatisfactionSurvey::satisfactionIndex)
                .findFirst()
                .orElse(null);
    }

    // /occurrences também não filtra por ano: traz tudo e conta só as do ano-base
    private int registeredOccurrences(List<Occurrence> occurrences, int year) {
        return (int) occurrences.stream()
                .filter(occurrence -> occurrence.occurrenceDate() != null && occurrence.occurrenceDate().getYear() == year)
                .count();
    }

    // % sempre recalculado a partir do numerador/denominador brutos, nunca guardado pronto na fonte
    private BigDecimal percentage(int part, int total) {
        if (total == 0) {
            return BigDecimal.ZERO;
        }

        return BigDecimal.valueOf(part * 100L).divide(BigDecimal.valueOf(total), 2, RoundingMode.HALF_UP);
    }
}
