package com.joao_v_marques.dashboard_esg.lawsuits.lawsuit_appeal;

import com.joao_v_marques.dashboard_esg.lawsuits.judging_body.JudgingBody;
import com.joao_v_marques.dashboard_esg.lawsuits.judging_body.JudgingBodyRepository;
import com.joao_v_marques.dashboard_esg.lawsuits.lawsuit.Lawsuit;
import com.joao_v_marques.dashboard_esg.lawsuits.lawsuit.LawsuitRepository;
import com.joao_v_marques.dashboard_esg.lawsuits.lawsuit_appeal.dto.LawsuitAppealRequest;
import com.joao_v_marques.dashboard_esg.lawsuits.lawsuit_appeal.dto.LawsuitAppealResponse;
import com.joao_v_marques.dashboard_esg.lawsuits.lawsuit_status.LawsuitStatus;
import com.joao_v_marques.dashboard_esg.lawsuits.lawsuit_status.LawsuitStatusRepository;
import com.joao_v_marques.dashboard_esg.lawsuits.loss_probability.LossProbability;
import com.joao_v_marques.dashboard_esg.lawsuits.loss_probability.LossProbabilityRepository;
import com.joao_v_marques.dashboard_esg.shared.exceptions.ResourceNotFoundException;
import com.joao_v_marques.dashboard_esg.shared.security.UserPrincipal;
import com.joao_v_marques.dashboard_esg.users.user.User;
import com.joao_v_marques.dashboard_esg.users.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class LawsuitAppealService {

    private final LawsuitAppealRepository lawsuitAppealRepository;
    private final LawsuitRepository lawsuitRepository;
    private final JudgingBodyRepository judgingBodyRepository;
    private final LawsuitStatusRepository lawsuitStatusRepository;
    private final LossProbabilityRepository lossProbabilityRepository;
    private final UserRepository userRepository;

    public LawsuitAppealService(LawsuitAppealRepository lawsuitAppealRepository, LawsuitRepository lawsuitRepository, JudgingBodyRepository judgingBodyRepository, LawsuitStatusRepository lawsuitStatusRepository, LossProbabilityRepository lossProbabilityRepository, UserRepository userRepository) {
        this.lawsuitAppealRepository = lawsuitAppealRepository;
        this.lawsuitRepository = lawsuitRepository;
        this.judgingBodyRepository = judgingBodyRepository;
        this.lawsuitStatusRepository = lawsuitStatusRepository;
        this.lossProbabilityRepository = lossProbabilityRepository;
        this.userRepository = userRepository;
    }

    // GET de todos os recursos cadastrados, agrupados por processo e ordenados pela sequência
    @Transactional(readOnly = true)
    public List<LawsuitAppealResponse> findAll() {
        return lawsuitAppealRepository.findAllByOrderByLawsuitIdAscAppealSequenceAsc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // GET dos recursos de um processo específico
    @Transactional(readOnly = true)
    public List<LawsuitAppealResponse> findAllByLawsuit(Integer lawsuitId) {
        // Confirmar se o processo realmente existe, para não confundir "sem recursos" com "processo inexistente"
        if (!lawsuitRepository.existsById(lawsuitId)) {
            throw new ResourceNotFoundException("Não foi encontrado nenhum processo com o ID informado.");
        }

        return lawsuitAppealRepository.findByLawsuitIdOrderByAppealSequenceAsc(lawsuitId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public LawsuitAppealResponse create(Integer lawsuitId, LawsuitAppealRequest request, UserPrincipal currentUser) {
        // Validação do processo de origem: precisa existir e estar ativo
        Lawsuit lawsuit = lawsuitRepository.findById(lawsuitId)
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrado nenhum processo com o ID informado."));
        if (!lawsuit.isActive()) {
            throw new IllegalArgumentException("Não é possível cadastrar recursos em um processo inativo.");
        }

        // Validação da FK de judgingBody, precisa existir e estar ativa
        JudgingBody judgingBody = judgingBodyRepository.findById(request.judgingBodyId())
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrado nenhum órgão julgador com o ID informado."));
        if (!judgingBody.isActive()) {
            throw new IllegalArgumentException("O órgão julgador informado está inativo.");
        }

        // Validação da FK de status, precisa existir e estar ativa
        LawsuitStatus status = lawsuitStatusRepository.findById(request.statusId())
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrado nenhum status de processo com o ID informado."));
        if (!status.isActive()) {
            throw new IllegalArgumentException("O status de processo informado está inativo.");
        }

        // Validação da FK de lossProbability, precisa existir e estar ativa
        LossProbability lossProbability = lossProbabilityRepository.findById(request.lossProbabilityId())
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrada nenhuma probabilidade de perda com o ID informado."));
        if (!lossProbability.isActive()) {
            throw new IllegalArgumentException("A probabilidade de perda informada está inativa.");
        }

        User insertedBy = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrado usuário com o ID informado."));

        // Próxima sequência do recurso dentro do processo (1, 2, 3...)
        Integer appealSequence = lawsuitAppealRepository.findMaxAppealSequenceByLawsuitId(lawsuitId) + 1;

        // Transformar a DTO de request em entidade
        LawsuitAppeal appeal = new LawsuitAppeal();
        appeal.setLawsuit(lawsuit);
        appeal.setAppealDate(request.appealDate());
        appeal.setAppealNumber(request.appealNumber().trim());
        appeal.setAppellant(request.appellant().trim());
        appeal.setAppellee(request.appellee().trim());
        appeal.setClaimValue(request.claimValue());
        appeal.setJudgingBody(judgingBody);
        appeal.setStatus(status);
        appeal.setLossProbability(lossProbability);
        appeal.setAppealSequence(appealSequence);
        appeal.setInsertedBy(insertedBy);

        lawsuitAppealRepository.save(appeal);

        return toResponse(appeal);
    }

    private LawsuitAppealResponse toResponse(LawsuitAppeal appeal) {
        return new LawsuitAppealResponse(
                appeal.getId(),
                appeal.getLawsuit().getId(),
                appeal.getLawsuit().getCaseNumber(),
                appeal.getAppealDate(),
                appeal.getAppealNumber(),
                appeal.getAppellant(),
                appeal.getAppellee(),
                appeal.getClaimValue(),
                appeal.getJudgingBody().getId(),
                appeal.getJudgingBody().getName(),
                appeal.getStatus().getId(),
                appeal.getStatus().getName(),
                appeal.getLossProbability().getId(),
                appeal.getLossProbability().getName(),
                appeal.getAppealSequence(),
                appeal.getInsertedBy().getId(),
                appeal.getInsertedBy().getName(),
                appeal.getCreatedAt(),
                appeal.getUpdatedAt(),
                appeal.getUpdatedBy() != null ? appeal.getUpdatedBy().getId() : null,
                appeal.getUpdatedBy() != null ? appeal.getUpdatedBy().getName() : null,
                appeal.isActive()
        );
    }
}
