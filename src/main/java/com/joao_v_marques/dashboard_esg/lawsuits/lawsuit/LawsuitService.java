package com.joao_v_marques.dashboard_esg.lawsuits.lawsuit;

import com.joao_v_marques.dashboard_esg.lawsuits.lawsuit.dto.LawsuitRequest;
import com.joao_v_marques.dashboard_esg.lawsuits.lawsuit.dto.LawsuitResponse;
import com.joao_v_marques.dashboard_esg.lawsuits.lawsuit_status.LawsuitStatus;
import com.joao_v_marques.dashboard_esg.lawsuits.lawsuit_status.LawsuitStatusRepository;
import com.joao_v_marques.dashboard_esg.lawsuits.loss_probability.LossProbability;
import com.joao_v_marques.dashboard_esg.lawsuits.loss_probability.LossProbabilityRepository;
import com.joao_v_marques.dashboard_esg.lawsuits.proceeding_stage.ProceedingStage;
import com.joao_v_marques.dashboard_esg.lawsuits.proceeding_stage.ProceedingStageRepository;
import com.joao_v_marques.dashboard_esg.lawsuits.subject_matter.SubjectMatter;
import com.joao_v_marques.dashboard_esg.lawsuits.subject_matter.SubjectMatterRepository;
import com.joao_v_marques.dashboard_esg.shared.exceptions.ConflictException;
import com.joao_v_marques.dashboard_esg.shared.exceptions.ResourceNotFoundException;
import com.joao_v_marques.dashboard_esg.shared.security.UserPrincipal;
import com.joao_v_marques.dashboard_esg.users.user.User;
import com.joao_v_marques.dashboard_esg.users.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class LawsuitService {

    private final LawsuitRepository lawsuitRepository;
    private final SubjectMatterRepository subjectMatterRepository;
    private final ProceedingStageRepository proceedingStageRepository;
    private final LawsuitStatusRepository lawsuitStatusRepository;
    private final LossProbabilityRepository lossProbabilityRepository;
    private final UserRepository userRepository;

    public LawsuitService(LawsuitRepository lawsuitRepository, SubjectMatterRepository subjectMatterRepository, ProceedingStageRepository proceedingStageRepository, LawsuitStatusRepository lawsuitStatusRepository, LossProbabilityRepository lossProbabilityRepository, UserRepository userRepository) {
        this.lawsuitRepository = lawsuitRepository;
        this.subjectMatterRepository = subjectMatterRepository;
        this.proceedingStageRepository = proceedingStageRepository;
        this.lawsuitStatusRepository = lawsuitStatusRepository;
        this.lossProbabilityRepository = lossProbabilityRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<LawsuitResponse> findAll() {
        return lawsuitRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public LawsuitResponse create(LawsuitRequest request, UserPrincipal currentUser) {
        String caseNumber = request.caseNumber().trim();

        // Validação de duplicidade (coluna UNIQUE)
        if (lawsuitRepository.existsByCaseNumber(caseNumber)) {
            throw new ConflictException("Já existe um processo cadastrado com este número.");
        }

        // Validação da FK de subjectMatter, precisa existir e estar ativa
        SubjectMatter subjectMatter = subjectMatterRepository.findById(request.subjectMatterId())
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrado nenhum objeto de processo com o ID informado."));
        if (!subjectMatter.isActive()) {
            throw new IllegalArgumentException("O objeto de processo informado está inativo.");
        }

        // Validação da FK de proceedingStage, precisa existir e estar ativa
        ProceedingStage proceedingStage = proceedingStageRepository.findById(request.proceedingStageId())
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrado nenhum trâmite de processo com o ID informado."));
        if (!proceedingStage.isActive()) {
            throw new IllegalArgumentException("O trâmite de processo informado está inativo.");
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

        // Transformar a DTO de request em entidade
        Lawsuit lawsuit = new Lawsuit();
        lawsuit.setLawsuitDate(request.lawsuitDate());
        lawsuit.setCaseNumber(caseNumber);
        lawsuit.setPlaintiff(request.plaintiff().trim());
        lawsuit.setDefendant(request.defendant().trim());
        lawsuit.setClaimValue(request.claimValue());
        lawsuit.setSubjectMatter(subjectMatter);
        lawsuit.setProceedingStage(proceedingStage);
        lawsuit.setStatus(status);
        lawsuit.setLossProbability(lossProbability);
        lawsuit.setInsertedBy(insertedBy);

        lawsuitRepository.save(lawsuit);

        return toResponse(lawsuit);
    }

    private LawsuitResponse toResponse(Lawsuit lawsuit) {
        return new LawsuitResponse(
                lawsuit.getId(),
                lawsuit.getLawsuitDate(),
                lawsuit.getCaseNumber(),
                lawsuit.getPlaintiff(),
                lawsuit.getDefendant(),
                lawsuit.getClaimValue(),
                lawsuit.getSubjectMatter().getId(),
                lawsuit.getSubjectMatter().getName(),
                lawsuit.getProceedingStage().getId(),
                lawsuit.getProceedingStage().getName(),
                lawsuit.getStatus().getId(),
                lawsuit.getStatus().getName(),
                lawsuit.getLossProbability().getId(),
                lawsuit.getLossProbability().getName(),
                lawsuit.getInsertedBy().getId(),
                lawsuit.getInsertedBy().getName(),
                lawsuit.getCreatedAt(),
                lawsuit.getUpdatedAt(),
                lawsuit.getUpdatedBy() != null ? lawsuit.getUpdatedBy().getId() : null,
                lawsuit.getUpdatedBy() != null ? lawsuit.getUpdatedBy().getName() : null,
                lawsuit.isActive()
        );
    }
}
